import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
    persist(
        (set) => ({
            // Appearance
            darkMode: false,
            sidebarCollapsed: false,
            fontSize: 'medium', // small | medium | large
            language: 'en', // en | ur
            colorScheme: 'indigo', // indigo | blue | emerald | rose | amber
            sidebarTheme: 'midnight', // midnight | ocean | emerald | purple | crimson | carbon | cleanLight

            // Notifications
            emailNotifications: true,
            smsNotifications: false,
            feeAlerts: true,
            attendanceAlerts: true,
            resultAlerts: true,

            // School Info
            schoolName: '',
            sessionYear: new Date().getFullYear().toString(),
            currency: 'PKR',
            dateFormat: 'DD/MM/YYYY',
            timezone: 'Asia/Karachi',

            // Fee Settings
            lateFeeEnabled: true,
            lateFeeAmount: 50,
            lateFeeAfterDays: 10,
            gracePeriodDays: 5,
            autoWaiveLateFee: true,

            // Attendance
            attendanceTime: '08:00',
            workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],

            // Print / PDF
            printHeaderEnabled: true,
            printFooterEnabled: true,
            printWatermark: false,

            // Actions
            setDarkMode: (val) => set({ darkMode: val }),
            setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),
            setFontSize: (val) => set({ fontSize: val }),
            setLanguage: (val) => set({ language: val }),
            setColorScheme: (val) => set({ colorScheme: val }),
            setSidebarTheme: (val) => set({ sidebarTheme: val }),
            updateSettings: (updates) => set((state) => ({ ...state, ...updates })),
        }),
        {
            name: 'sms-settings',
        }
    )
);
