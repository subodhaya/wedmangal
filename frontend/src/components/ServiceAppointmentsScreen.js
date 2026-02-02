import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './ServiceAppointmentsScreen.css';

const ServiceAppointmentsScreen = () => {
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [calendarView, setCalendarView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userInfo = JSON.parse(localStorage.getItem('userInfo')) || null;

  useEffect(() => {
    const fetchAppointments = async () => {
      const userInfo = JSON.parse(localStorage.getItem('userInfo')) || null;

      if (!userInfo || userInfo.role !== 'service-owner') {
        setError('Unauthorized');
        setLoading(false);
        return;
      }

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        };

        // Fetch product
        const { data: product } = await axios.get(
          `/api/products/by-user/${userInfo._id}/`,
          config
        );

        // Optional: fetch services (not used directly)
        await axios.get(`/api/products/by-product/${product._id}/`, config);
        console.log('productId before rendering:', product._id);


        // Fetch appointments
        const { data: fetchedAppointments } = await axios.get(
          `/api/products/appointments/${product._id}/`,
          config
        );

        // Sort appointments by date descending
        const sortedAppointments = [...fetchedAppointments].sort((a, b) => {
          const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
          const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
          return dateB - dateA; // Newest first
        });

        setAppointments(sortedAppointments);
        setFilteredAppointments(sortedAppointments);
      } catch (err) {
        console.error('Error fetching appointments:', err);
        setError('Failed to load appointments');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);





  useEffect(() => {
    let filtered = [...appointments];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status?.toLowerCase() === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter((a) => a.date === dateFilter);
    }

    setFilteredAppointments(filtered);
  }, [statusFilter, dateFilter, appointments]);

  // Update status (Completed / Cancelled)
  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.put(
        `/api/products/appointments/${orderId}/update/`,
        { status: newStatus },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
        }
      );

      const updated = appointments.map((a) =>
        a.order_id === orderId ? { ...a, status: newStatus } : a
      );
      setAppointments(updated);
    } catch (err) {
      console.error('Status update failed', err);
    }
  };


 



  const getAppointmentsForDate = (date) => {
    // Subtract one day to correct the timezone offset
    const correctedDate = new Date(date);
    correctedDate.setDate(date.getDate() + 2);
    const formatted = correctedDate.toISOString().split('T')[0];
    return filteredAppointments.filter((a) => a.date === formatted);
  };
  
  
  

  const tileContent = ({ date, view }) => {
    if (view === 'month' && getAppointmentsForDate(date).length > 0) {
      return <div className="calendar-dot" />;
    }
    return null;
  };

  const tileTooltip = ({ date }) => {
    const appts = getAppointmentsForDate(date);
    return appts.length > 0
      ? appts.map((a) => `${a.service_name} - ${a.name}`).join('\n')
      : null;
  };

  // Render
  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="appointments-container">
      <h2 className="heading">📅 My Service Appointments</h2>

      {/* View Toggle */}
      <div className="view-toggle">
        <button onClick={() => setCalendarView(false)} className={!calendarView ? 'active' : ''}>
          📋 List View
        </button>
        <button onClick={() => setCalendarView(true)} className={calendarView ? 'active' : ''}>
          🗓️ Calendar View
        </button>
      </div>

      {/* List View */}
      {!calendarView && (
        <>
          {/* Filters */}
          <div className="filters">
            <label>Status:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <label>Date:</label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />
          </div>

          {/* Appointments List */}
          {filteredAppointments.length > 0 ? (
            <div className="appointment-list">
              {filteredAppointments.map((appt, index) => (
                <div key={appt.id || index} className="appointment-card">
                  <div className="appointment-header">
                    <h4>{appt.serviceName || 'Service Name'}</h4>
                    <span className={`status ${appt.status?.toLowerCase()}`}>
                      {appt.status || 'Pending'}
                    </span>
                  </div>
                  <div className="appointment-body">
                    <p><strong>🆔 Order ID:</strong> {appt.orderId}</p>
                    <p><strong>👤 Customer:</strong> {appt.customerName || 'Unknown'}</p>
                    <p><strong>📅 Date:</strong> {appt.date || 'N/A'}</p>
                    <p><strong>⏰ Time:</strong> {appt.time || 'N/A'}</p>
                  </div>
                  <div className="appointment-actions">
                    {appt.status !== 'completed' && (
                      <button onClick={() => updateStatus(appt.orderId, 'completed')}>
                        ✅ Mark as Done
                      </button>
                    )}
                    {appt.status !== 'cancelled' && (
                      <button
                        onClick={() => updateStatus(appt.orderId, 'cancelled')}
                        className="cancel-btn"
                      >
                        ❌ Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No appointments match your filters.</p>
          )}
        </>
      )}

      {/* Calendar View */}
      {calendarView && (
        <div className="calendar-container">
          <Calendar
            tileContent={tileContent}
            tileDisabled={({ date }) => getAppointmentsForDate(date).length === 0}
            tileClassName={({ date }) =>
              getAppointmentsForDate(date).length > 0 ? 'has-appointments' : ''
            }
            tileLabel={({ date }) => <span>{date.getDate()}</span>}
            formatShortWeekday={(locale, date) =>
              date.toLocaleDateString(locale, { weekday: 'short' })
            }
            showNeighboringMonth={false}
            tileTooltip={tileTooltip}
          />
        </div>
      )}
    </div>
  );
};

export default ServiceAppointmentsScreen;
