import React, { useRef, useEffect } from 'react';
import './SlotPicker.css';

/*
  Usage in ProductScreen:

  <SlotPicker
    selectedTime={selectedStartTimes[service._id] || ''}
    selectedEndTime={selectedEndTimes[service._id] || ''}
    onTimeChange={(time) => setSelectedStartTimes(prev => ({ ...prev, [service._id]: time }))}
    onEndTimeChange={(time) => setSelectedEndTimes(prev => ({ ...prev, [service._id]: time }))}
  />
*/

const generateSlots = () => {
    const slots = [];
    for (let h = 6; h <= 23; h++) {
        for (const m of ['00', '30']) {
            if (h === 23 && m === '30') break;
            const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
            const ampm   = h >= 12 ? 'PM' : 'AM';
            slots.push({
                label: `${String(hour12).padStart(2, '0')}:${m}`,
                ampm,
                value: `${String(h).padStart(2, '0')}:${m}`,
            });
        }
    }
    return slots;
};

const TIME_SLOTS = generateSlots();

// Filter end time slots to only show times after start time
const getEndSlots = (startValue) => {
    if (!startValue) return TIME_SLOTS;
    const [sh, sm] = startValue.split(':').map(Number);
    const startMins = sh * 60 + sm;
    return TIME_SLOTS.filter(slot => {
        const [eh, em] = slot.value.split(':').map(Number);
        return eh * 60 + em > startMins;
    });
};

export default function SlotPicker({
    selectedTime,
    selectedEndTime,
    onTimeChange,
    onEndTimeChange,
}) {
    const startRef = useRef(null);
    const endRef   = useRef(null);

    // Auto-scroll start time into view
    useEffect(() => {
        if (selectedTime && startRef.current) {
            const idx = TIME_SLOTS.findIndex(s => s.value === selectedTime);
            if (idx !== -1) startRef.current.children[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedTime]);

    // Auto-scroll end time into view
    useEffect(() => {
        if (selectedEndTime && endRef.current) {
            const endSlots = getEndSlots(selectedTime);
            const idx = endSlots.findIndex(s => s.value === selectedEndTime);
            if (idx !== -1) endRef.current.children[idx]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [selectedEndTime, selectedTime]);

    // When start time changes, clear end time if it's now invalid
    const handleStartChange = (time) => {
        onTimeChange(time);
        if (selectedEndTime) {
            const [sh, sm] = time.split(':').map(Number);
            const [eh, em] = selectedEndTime.split(':').map(Number);
            if (eh * 60 + em <= sh * 60 + sm) {
                onEndTimeChange(''); // reset end time
            }
        }
    };

    const endSlots = getEndSlots(selectedTime);
    const startLabel = TIME_SLOTS.find(s => s.value === selectedTime);
    const endLabel   = TIME_SLOTS.find(s => s.value === selectedEndTime);

    return (
        <div className="slotpicker-wrap">

            {/* ── Column headers ── */}
            <div className="slotpicker-headers">
                <div className="slotpicker-col-label">⏰ Start Time</div>
                <div className="slotpicker-col-label">🏁 End Time</div>
            </div>

            {/* ── Two scroll columns ── */}
            <div className="slotpicker-columns">

                {/* Start time list */}
                <div className="slotpicker-scroll" ref={startRef}>
                    {TIME_SLOTS.map(slot => (
                        <div
                            key={slot.value}
                            className={`slotpicker-item ${selectedTime === slot.value ? 'active' : ''}`}
                            onClick={() => handleStartChange(slot.value)}
                        >
                            <span className="si-time">{slot.label}</span>
                            <span className="si-ampm">{slot.ampm}</span>
                        </div>
                    ))}
                </div>

                <div className="slotpicker-sep" />

                {/* End time list — only shows times after start */}
                <div className="slotpicker-scroll" ref={endRef}>
                    {!selectedTime ? (
                        <div className="slotpicker-item disabled">
                            <span className="si-time" style={{ color: '#bbb', fontSize: '0.78rem' }}>Pick start first</span>
                        </div>
                    ) : endSlots.map(slot => (
                        <div
                            key={slot.value}
                            className={`slotpicker-item ${selectedEndTime === slot.value ? 'active' : ''}`}
                            onClick={() => onEndTimeChange(slot.value)}
                        >
                            <span className="si-time">{slot.label}</span>
                            <span className="si-ampm">{slot.ampm}</span>
                        </div>
                    ))}
                </div>

            </div>

            {/* ── Summary / hint ── */}
            {selectedTime && selectedEndTime ? (
                <div className="slotpicker-summary">
                    <span>🕐 <b>{startLabel?.label} {startLabel?.ampm}</b></span>
                    <span className="sp-dot">→</span>
                    <span>🏁 <b>{endLabel?.label} {endLabel?.ampm}</b></span>
                </div>
            ) : (
                <div className="slotpicker-hint">
                    {!selectedTime ? '👆 Pick a start time' : '👆 Now pick an end time'}
                </div>
            )}

        </div>
    );
}