'use client';

import React from 'react';
import ChatLayout from './components/ChatLayout';

export default function InboxPage() {
    return (
        <div className="h-[calc(100vh-64px)] w-full bg-gray-50 overflow-hidden">
            <ChatLayout />
        </div>
    );
}
