// src/screens/BudgetScreen.jsx
import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2';
import { Row, Col, Form, Button } from 'react-bootstrap';
import api from '../utils/api';
import './BudgetScreen.css';

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

  const defaultExpenses = {
    venue: 0, jewels: 0, catering: 0, decoration: 0, photography: 0,
  };

  const fetchBudget = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const pk = userInfo?.id;
    if (!pk) { setErrorMessage('User not found.'); return; }
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
    setLoading(true);
    api.get(`/api/orders/get-budget/${pk}/`, config)
      .then((response) => {
        if (response.data) {
          setTotalBudget(response.data.total_budget || 0);
          setExpenses({ ...defaultExpenses, ...(response.data.expenses || {}) });
          setErrorMessage('');
        }
      })
      .catch(() => setErrorMessage('Error fetching budget. Please try again.'))
      .finally(() => setLoading(false));
  };

  const handleSave = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    const pk = userInfo?.id;
    if (!pk) { setErrorMessage('User not found.'); return; }
    const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
    api.post(`/api/orders/update-budget/${pk}/`, { total_budget: totalBudget, expenses }, config)
      .then(() => { setSuccessMessage('Budget saved successfully!'); setErrorMessage(''); })
      .catch(() => { setErrorMessage('Failed to save budget. Please try again.'); setSuccessMessage(''); });
  };

  const totalSpent = Object.values(expenses).reduce((a, b) => a + b, 0);
  const remaining = totalBudget - totalSpent;
  const spentPct  = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

  const COLORS = ['#5e143f', '#c9973a', '#8a2057', '#e8b86d', '#b5436a', '#d4a055'];

  const chartData = {
    labels: Object.keys(expenses).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
    datasets: [{
      data: Object.values(expenses),
      backgroundColor: COLORS,
      borderColor: '#fff',
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: "'DM Sans', sans-serif", size: 12 },
          padding: 12,
          usePointStyle: true,
        },
      },
    },
  };

  useEffect(() => { fetchBudget(); }, []);

  const expenseIcons = {
    venue: '🏛️', jewels: '💎', catering: '🍽️',
    decoration: '🌸', photography: '📷',
  };

  return (
    <div className="budget-screen">

      {/* ── Page header ── */}
      <div className="budget-page-header">
        <h2 className="budget-page-title">💰 Budget Planner</h2>
        <p className="budget-page-sub">Plan and track your wedding expenses in one place</p>
      </div>

      {/* ── Summary cards ── */}
      <div className="budget-summary-row">
        <div className="budget-summary-card total">
          <span className="summary-label">Total Budget</span>
          <span className="summary-value">₹{Number(totalBudget).toLocaleString('en-IN')}</span>
        </div>
        <div className="budget-summary-card spent">
          <span className="summary-label">Total Spent</span>
          <span className="summary-value">₹{Number(totalSpent).toLocaleString('en-IN')}</span>
        </div>
        <div className={`budget-summary-card remaining ${remaining < 0 ? 'over' : ''}`}>
          <span className="summary-label">Remaining</span>
          <span className="summary-value">₹{Number(remaining).toLocaleString('en-IN')}</span>
        </div>
      </div>

      {/* ── Progress bar ── */}
      {totalBudget > 0 && (
        <div className="budget-progress-wrap">
          <div className="budget-progress-bar">
            <div
              className="budget-progress-fill"
              style={{ width: `${spentPct}%`, background: spentPct > 90 ? '#c0392b' : '#5e143f' }}
            />
          </div>
          <span className="budget-progress-label">{spentPct.toFixed(1)}% spent</span>
        </div>
      )}

      <Row className="budget-main-row">

        {/* ── Left: Form ── */}
        <Col md={7}>
          <div className="budget-card">

            {/* Total budget input */}
            <div className="budget-section-title">
              <span className="section-dot" />
              Set Total Budget
            </div>
            <div className="budget-total-input-row">
              <span className="rupee-prefix">₹</span>
              <Form.Control
                type="number"
                className="budget-total-input"
                value={totalBudget}
                onChange={(e) => setTotalBudget(parseFloat(e.target.value) || 0)}
                placeholder="Enter your total budget"
              />
            </div>

            {/* Expenses list */}
            <div className="budget-section-title" style={{ marginTop: '1.5rem' }}>
              <span className="section-dot" />
              Expense Categories
            </div>

            <div className="expense-list">
              {Object.keys(expenses).map((key, i) => (
                <div className="expense-row" key={key}>
                  <div className="expense-label-wrap">
                    <span className="expense-icon">{expenseIcons[key] || '💸'}</span>
                    <span className="expense-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  </div>
                  <div className="expense-input-wrap">
                    <span className="rupee-prefix small">₹</span>
                    <Form.Control
                      type="number"
                      className="expense-input"
                      value={expenses[key]}
                      onChange={(e) => setExpenses({ ...expenses, [key]: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add new expense */}
            <div className="budget-section-title" style={{ marginTop: '1.5rem' }}>
              <span className="section-dot" />
              Add Custom Expense
            </div>
            <div className="add-expense-row">
              <Form.Control
                type="text"
                className="add-expense-name"
                placeholder="Expense name"
                value={newExpenseName}
                onChange={(e) => setNewExpenseName(e.target.value)}
              />
              <div className="add-expense-amount-wrap">
                <span className="rupee-prefix small">₹</span>
                <Form.Control
                  type="number"
                  className="expense-input"
                  placeholder="Amount"
                  value={newExpenseAmount}
                  onChange={(e) => setNewExpenseAmount(parseFloat(e.target.value) || 0)}
                />
              </div>
              <button
                className="add-expense-btn"
                onClick={() => {
                  if (newExpenseName && newExpenseAmount) {
                    setExpenses({ ...expenses, [newExpenseName.toLowerCase()]: newExpenseAmount });
                    setNewExpenseName('');
                    setNewExpenseAmount('');
                  }
                }}
              >
                + Add
              </button>
            </div>

            {/* Save button + messages */}
            <div className="budget-save-row">
              <button className="budget-save-btn" onClick={handleSave}>
                💾 Save Budget
              </button>
              {successMessage && <span className="budget-msg success">✓ {successMessage}</span>}
              {errorMessage   && <span className="budget-msg error">✗ {errorMessage}</span>}
            </div>

          </div>
        </Col>

        {/* ── Right: Chart ── */}
        <Col md={5}>
          <div className="budget-card chart-card">
            <div className="budget-section-title">
              <span className="section-dot" />
              Expenses Breakdown
            </div>
            {totalSpent > 0 ? (
              <div className="chart-wrap">
                <Pie data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="chart-empty">
                <span className="chart-empty-icon">📊</span>
                <p>Add expenses to see your breakdown</p>
              </div>
            )}

            {/* Mini legend with amounts */}
            {totalSpent > 0 && (
              <div className="chart-legend">
                {Object.entries(expenses).filter(([, v]) => v > 0).map(([key, val], i) => (
                  <div className="legend-item" key={key}>
                    <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="legend-label">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <span className="legend-amount">₹{Number(val).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Col>

      </Row>
    </div>
  );
};

export default BudgetScreen;