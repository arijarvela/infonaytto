import React, { useEffect } from 'react';

const TimetableCard = () => {
    const [initialDate, setInitialDate] = React.useState(new Date());

    useEffect(() => {
        const updateDate = () => {
            const now = new Date();
            // Assuming the school day starts at 08:00
            const schoolDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0);
            const nextSchoolDay = (now.getHours() >= 8) ? schoolDayStart.setDate(schoolDayStart.getDate() + 1) : schoolDayStart;
            setInitialDate(new Date(nextSchoolDay));
        };

        updateDate(); // Initialize on mount
        const intervalId = setInterval(updateDate, 60000); // Update every minute

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, []);

    return (
        <div>
            <h1>Timetable for {initialDate.toLocaleDateString()}</h1>
            {/* Render the timetable here based on initialDate */}
        </div>
    );
};

export default TimetableCard;