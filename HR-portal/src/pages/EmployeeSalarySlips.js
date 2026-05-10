import React, { useState, useEffect } from 'react';
import api from '../api/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDownload, FiCalendar, FiDollarSign, FiFileText, FiEye, FiX } from 'react-icons/fi';
import Spinner from '../components/Spinner';
import Button from '../components/Button';

const BACKEND_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const resolveAssetUrl = (assetPath) => {
    if (!assetPath) return '';
    if (/^(https?:)?\/\//i.test(assetPath) || assetPath.startsWith('data:')) {
        return assetPath;
    }
    const normalizedPath = assetPath.startsWith('/') ? assetPath : `/${assetPath}`;
    return `${BACKEND_BASE_URL}${normalizedPath}`;
};

const calculateTotalExpenses = (slip) => (slip.employeeExpenses || []).reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0), 0
);

const calculateDueWithExpenses = (slip) => {
    const salaryDue = typeof slip.balanceDue === 'number'
        ? slip.balanceDue
        : Math.max(0, (slip.netSalary || 0) - (slip.totalPaid || 0));
    const expenseDue = Math.max(0, calculateTotalExpenses(slip) - (slip.expensesPaid || 0));
    return {
        salaryDue,
        expenseDue,
        totalDue: salaryDue + expenseDue
    };
};

const EmployeeSalarySlips = () => {
    const [salarySlips, setSalarySlips] = useState([]);
    const [selectedSlip, setSelectedSlip] = useState(null);
    const [loading, setLoading] = useState(true);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        fetchSalarySlips();
    }, []);

    const fetchSalarySlips = async () => {
        try {
            setLoading(true);
            const response = await api.get('/employee/salary-slips');
            setSalarySlips(response.data);
        } catch (error) {
            console.error('Error fetching salary slips, using mock data:', error);
            setSalarySlips([
                {
                    _id: '1',
                    employeeName: 'Test User',
                    employeeCode: 'CODEXA-1003',
                    month: 'May',
                    year: '2024',
                    baseSalary: 50000,
                    netSalary: 48000,
                    totalPaid: 48000,
                    balanceDue: 0,
                    status: 'Paid',
                    createdAt: new Date().toISOString(),
                    payments: [{ amount: 48000, date: new Date().toISOString() }],
                    attendance: { totalWorkingDays: 22, presentDays: 20, absentDays: 2 }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = (slip) => {
        const printWindow = window.open('', '_blank');
        const content = generatePDFContent(slip);
        printWindow.document.write(content);
        printWindow.document.close();

        const logoImg = printWindow.document.querySelector('.logo');
        if (logoImg) {
            logoImg.onload = () => {
                setTimeout(() => printWindow.print(), 100);
            };
            logoImg.onerror = () => {
                setTimeout(() => printWindow.print(), 100);
            };
        } else {
            setTimeout(() => printWindow.print(), 100);
        }
    };

    const generatePDFContent = (slip) => {
        const totalPaid = (slip.payments || []).reduce((acc, curr) => acc + (curr.amount || 0), 0);
        const expenseTotal = calculateTotalExpenses(slip);
        const expenseDue = Math.max(0, expenseTotal - (slip.expensesPaid || 0));
        const combinedDue = (slip.balanceDue || 0) + expenseDue;
        const latestPayment = slip.payments && slip.payments.length > 0 ? slip.payments[slip.payments.length - 1] : {};
        const signatoryImageUrl = resolveAssetUrl(slip.authorizedSignatoryImage);
        const stampImageUrl = resolveAssetUrl(slip.companyStampImage);

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Salary Slip - ${slip.employeeName}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 30px; color: #000; line-height: 1.4; }
                    .container { max-width: 800px; margin: 0 auto; border: 1px solid #000; padding: 20px; }
                    .title { text-align: center; font-size: 24px; font-weight: bold; text-decoration: underline; margin-bottom: 30px; text-transform: uppercase; }
                    .section-title { font-size: 18px; font-weight: bold; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                    td { padding: 8px; border: 1px solid #000; vertical-align: top; font-size: 14px; }
                    .label { font-weight: bold; width: 40%; }
                    .value { width: 60%; }
                    .footer { margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .signatory-line { border-bottom: 1px solid #000; width: 200px; display: inline-block; margin-left: 10px; height: 1px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="title">SALARY SLIP</div>
                    <div class="section-title">Company Details</div>
                    <table>
                        <tr><td class="label">Company Name</td><td class="value">${slip.companyName || 'Codexa'}</td></tr>
                        <tr><td class="label">Company Address</td><td class="value">${slip.companyAddress || 'Codexa Tech Park, Bangalore'}</td></tr>
                    </table>
                    <div class="section-title">Employee Details</div>
                    <table>
                        <tr><td class="label">Employee Name</td><td class="value">${slip.employeeName}</td></tr>
                        <tr><td class="label">Employee Code</td><td class="value">${slip.employeeCode}</td></tr>
                    </table>
                    <div class="section-title">Salary Details</div>
                    <table>
                        <tr><td class="label">Net Salary Paid</td><td class="value" style="font-weight: bold;">₹${(slip.netSalary || 0).toLocaleString()}</td></tr>
                    </table>
                    <div class="footer">
                        <div>
                            <p>Authorized Signatory</p>
                            <div class="signatory-line"></div>
                        </div>
                        <div>
                            <p>Company Stamp</p>
                            <div class="signatory-line"></div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `;
    };

    return (
        <div className="min-h-screen p-6 bg-gradient-to-br from-[#fff5e6] to-[#f5e6d3] dark:from-gray-900 dark:to-black">
            <h1 className="text-3xl font-bold mb-6 text-[#433020] dark:text-white">Your Salary Slips</h1>
            {loading ? <Spinner /> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {salarySlips.map(slip => (
                        <div key={slip._id} className="bg-white/80 dark:bg-gray-800 p-6 rounded-3xl shadow-xl">
                            <h3 className="text-xl font-bold mb-2">{slip.month} {slip.year}</h3>
                            <p className="text-sm text-gray-500 mb-4">Net Salary: ₹{slip.netSalary.toLocaleString()}</p>
                            <Button onClick={() => handleDownloadPDF(slip)} variant="brand">Download PDF</Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EmployeeSalarySlips;
