import React, { useState, useEffect } from 'react';
import { Bell, Mail, MessageSquare, Briefcase, ChevronDown, ChevronUp, CheckCircle, Clock, RefreshCw } from 'lucide-react';

// --- N8N WEBHOOK URLs ---
const GET_RENEWALS_URL = 'https://renewal-56rp.onrender.com/webhook/920faf43-19cc-4758-ac77-70d4a9b746d8';
const SEND_REMINDER_URL_BASE = 'https://renewal-56rp.onrender.com/webhook/06271733-f596-4b16-ae1d-fa28cfda2141';

const App = () => {
    const [renewals, setRenewals] = useState([]);
    const [expandedMonths, setExpandedMonths] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchRenewals = async () => {
        setIsLoading(true);
        setError(null);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); 

        try {
            const response = await fetch(GET_RENEWALS_URL, {
                signal: controller.signal 
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // 1. Ensure the data is always an array
            const dataArray = Array.isArray(data) ? data : (data && Object.keys(data).length > 0 ? [data] : []);

            // 2. --- NEW FIX ---
            // Filter out any empty objects ({}) that n8n might have sent
            const filteredData = dataArray.filter(item => 
                item && Object.keys(item).length > 0
            );
    
            // 3. Initialize reminder statuses using the *filtered* array
            const initialRenewals = filteredData.map(r => ({ ...r, reminders: { email: 'pending', whatsapp: 'pending', crm: 'pending' } }));
            setRenewals(initialRenewals);
            
            // --- BUG FIX ---
            // The variable was 'jsonData', changed to 'data'.
            if (Object.keys(data).length === 0) {
                console.log("The fetch returned an empty JSON object ({}).");
            }

        } catch (e) {
            // This 'catch' block handles if n8n stops and sends *nothing*
            if (e.name === 'AbortError') {
                console.error("Fetch aborted due to timeout.");
                setError("The request timed out because the n8n workflow is taking too long to respond.");
            } else {
                console.error("Failed to fetch renewals:", e);
                setError("Could not load renewal data. n8n may have stopped or failed to respond.");
            }
            setRenewals([]); // Clear out any old data on error
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRenewals();

        // By default, expand the current and next month
        const currentMonthIndex = new Date().getMonth();
        const monthOrder = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonth = monthOrder[currentMonthIndex];
        const nextMonth = monthOrder[(currentMonthIndex + 1) % 12];
        
        setExpandedMonths({
            [currentMonth]: true,
            [nextMonth]: true,
        });

    }, []);

    const groupedRenewals = renewals.reduce((acc, renewal) => {
        const month = renewal.renewal_month || 'Uncategorized';
        if (!acc[month]) {
            acc[month] = [];
        }
        acc[month].push(renewal);
        return acc;
    }, {});

    const monthOrder = ["October", "November", "December", "January", "February", "March", "April", "May", "June", "July", "August", "September"];
    
    // This sort logic is fine
    const sortedMonths = Object.keys(groupedRenewals).sort((a, b) => {
        return monthOrder.indexOf(a) - monthOrder.indexOf(b);
    });

    const handleSendReminder = async (renewal, type) => {
        console.log(`Sending ${type} reminder for ${renewal.email}`);
        
        try {
            const response = await fetch(`https://renewal-56rp.onrender.com/webhook/06271733-f596-4b16-ae1d-fa28cfda2141`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: renewal.email,
                    name: renewal.name,
                    company_name: renewal.company_name,
                    renewal_month: renewal.renewal_month
                })
            });
    
            if (!response.ok) {
                throw new Error('n8n workflow failed to execute reminder.');
            }
    
            setRenewals(prevRenewals => prevRenewals.map(r => {
                if (r.email === renewal.email) {
                    return { ...r, reminders: { ...r.reminders, [type]: 'sent' } };
                }
                return r;
            }));
    
        } catch (e) {
            console.error(`Failed to send ${type} reminder:`, e);
            alert(`Error: Could not send ${type} reminder.`);
        }
    };
    
    const toggleMonth = (month) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
    };

    const ReminderButton = ({ type, status, onClick }) => {
        const icons = {
            email: <Mail size={16} />
        };
        const text = {
            email: 'Email Reminder'
        };
        const isSent = status === 'sent';

        return (
            <button
                onClick={onClick}
                disabled={isSent}
                className={`flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ease-in-out ${
                    isSent
                        ? 'bg-green-100 text-green-700 cursor-not-allowed'
                        : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                }`}
            >
                {isSent ? <CheckCircle size={16} /> : icons[type]}
                {isSent ? `${text[type]} Sent` : `Send ${text[type]}`}
            </button>
        );
    };

    return (
        <div className="bg-gray-50 min-h-screen font-sans">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="bg-indigo-600 p-2 rounded-lg text-white">
                                <Bell size={28} />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-800">Upcoming Renewals Dashboard</h1>
                        </div>
                        <p className="mt-2 text-gray-600">Proactively manage client renewals and automate reminders.</p>
                    </div>
                    <button onClick={fetchRenewals} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors">
                        <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        {isLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </header>

                <main className="space-y-6">
                    {isLoading && <p className="text-center text-gray-600">Loading renewals...</p>}
                    {error && <p className="text-center text-red-600 bg-red-100 p-4 rounded-lg">{error}</p>}
                    {!isLoading && !error && renewals.length === 0 && <p className="text-center text-gray-600">No upcoming renewals found.</p>}

                    {!isLoading && !error && sortedMonths.map(month => (
                        <section key={month} className="bg-white border border-gray-200 rounded-xl shadow-sm">
                            <div className="p-4 cursor-pointer" onClick={() => toggleMonth(month)}>
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-semibold text-gray-700">{month}</h2>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{groupedRenewals[month].length} Renewals</span>
                                       {expandedMonths[month] ? <ChevronUp className="text-gray-500" /> : <ChevronDown className="text-gray-500" />}
                                    </div>
                                </div>
                            </div>
                            
                            {expandedMonths[month] && (
                                <div className="border-t border-gray-200">
                                    <div className="divide-y divide-gray-200">
                                        {groupedRenewals[month].map(renewal => (
                                            // Added a fallback key in case email is missing
                                            <div key={renewal.email || Math.random()} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                                <div className="md:col-span-1">
                                                    <p className="font-semibold text-gray-800">{renewal.name}</p>
                                                    <p className="text-sm text-gray-500">{renewal.company_name}</p>
                                                    <p className="text-sm text-gray-500">{renewal.email}</p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                    <ReminderButton type="email" status={renewal.reminders.email} onClick={() => handleSendReminder(renewal, 'email')} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    ))}
                </main>
            </div>
        </div>
    );
};

export default App;
