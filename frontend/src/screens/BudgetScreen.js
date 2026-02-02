import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Row, Col, Form, Button } from 'react-bootstrap';
import api from '../utils/api';  

const BudgetScreen = () => {
  const [totalBudget, setTotalBudget] = useState(0);
  const [expenses, setExpenses] = useState({
    venue: 0,
    jewels: 0,
    catering: 0,
    decoration: 0,
    photography: 0,
  });
  const [newExpenseName, setNewExpenseName] = useState('');
  const [newExpenseAmount, setNewExpenseAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Default expenses
  const defaultExpenses = {
    venue: 0,
    jewels: 0,
    catering: 0,
    decoration: 0,
    photography: 0,
  };

  // Fetch Budget Data
  const fetchBudget = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const pk = userInfo?.id;

    if (!pk) {
      setErrorMessage('User not found.');
      return;
    }

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    };

    setLoading(true);
    api
      .get(`/api/orders/get-budget/${pk}/`, config)
      .then((response) => {
        if (response.data) {
          setTotalBudget(response.data.total_budget || 0);

          // Set expenses with default values if not present
          const fetchedExpenses = response.data.expenses || {};
          setExpenses({
            ...defaultExpenses,
            ...fetchedExpenses,
          });
          setErrorMessage('');
        }
      })
      .catch((error) => {
        setErrorMessage('Error fetching budget. Please try again.');
        console.error('Error fetching budget:', error);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Save Budget Data
  const handleSave = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const pk = userInfo?.id;

    if (!pk) {
      setErrorMessage('User not found.');
      return;
    }

    const data = {
      total_budget: totalBudget,
      expenses,
    };

    const config = {
      headers: {
        Authorization: `Bearer ${userInfo.token}`,
      },
    };

    api
      .post(`/api/orders/update-budget/${pk}/`, data, config)
      .then(() => {
        setSuccessMessage('Budget saved successfully!');
        setErrorMessage('');
      })
      .catch((error) => {
        setErrorMessage('Failed to save budget. Please try again.');
        setSuccessMessage('');
        console.error('Error saving budget:', error);
      });
  };

  // Chart Data
  const chartData = {
    labels: Object.keys(expenses),
    datasets: [
      {
        label: 'Expenses',
        data: Object.values(expenses),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
        ],
      },
    ],
  };

  useEffect(() => {
    fetchBudget();
  }, []);


    return (
      <div className="budget-screen">
        <h2>Budget Management</h2>
        <Row>
          <Col md={8}>
            <Form>
              <Form.Group as={Row} className="mb-3 align-items-center">
                <Form.Label column sm="4">
                  Total Budget:
                </Form.Label>
                <Col sm="4">
                  <Form.Control
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
                  />
                </Col>
              </Form.Group>
  
              <h3>Expenses</h3>
              {Object.keys(expenses).map((key) => (
                <Form.Group as={Row} key={key} className="mb-3 align-items-center">
                  <Form.Label column sm="4">
                    {key.charAt(0).toUpperCase() + key.slice(1)}:
                  </Form.Label>
                  <Col sm="4">
                    <Form.Control
                      type="number"
                      value={expenses[key]}
                      onChange={(e) =>
                        setExpenses({
                          ...expenses,
                          [key]: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </Col>
                </Form.Group>
              ))}
  
              <h4>Add New Expense</h4>
              <Form.Group as={Row} className="mb-3 align-items-center">
  <Col sm="3">
    <Form.Control
      type="text"
      placeholder="Expense Name"
      value={newExpenseName}
      onChange={(e) => setNewExpenseName(e.target.value)}
    />
  </Col>
  <Col sm="3">
    <Form.Control
      type="number"
      placeholder="Expense Amount"
      value={newExpenseAmount}
      onChange={(e) => setNewExpenseAmount(parseFloat(e.target.value) || 0)}
    />
  </Col>
  <Col sm="1" className="p-0">
    <Button
      onClick={() => {
        if (newExpenseName && newExpenseAmount) {
          setExpenses({
            ...expenses,
            [newExpenseName]: newExpenseAmount,
          });
          setNewExpenseName('');
          setNewExpenseAmount('');
        }
      }}
      className="btn btn-primary mt-0"
    >
      +
    </Button>
  </Col>
</Form.Group>

  
              <Row className="mt-3">
  <Col sm="4">
    <Button onClick={handleSave} className="btn btn-primary btn-sm">
      Save Budget
    </Button>
  </Col>
</Row>
  
              {successMessage && <p className="text-success mt-2">{successMessage}</p>}
              {errorMessage && <p className="text-danger mt-2">{errorMessage}</p>}
            </Form>
          </Col>
          <Col md={4}>
            <h3>Expenses Breakdown</h3>
            <Pie data={chartData} />
          </Col>
        </Row>
      </div>
    );
  };
  
  export default BudgetScreen;
  
