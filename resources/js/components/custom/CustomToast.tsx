import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import React, { useEffect } from 'react';

interface CustomToastProps {
    message: string;
    description?: string;
    type?: 'info' | 'success' | 'error' | 'warning';
    onClose: () => void;
    duration?: number; // Duration in ms for auto-dismiss
}

const CustomToast: React.FC<CustomToastProps> = ({
    message,
    description,
    type = 'info',
    onClose,
    duration = 5000, // Default 5 seconds
}) => {
    const IconComponent = {
        info: Info,
        success: CheckCircle,
        error: XCircle,
        warning: AlertTriangle,
    }[type];

    let iconColorClass = 'text-sky-500';
    let borderColorClass = 'border-sky-500';

    switch (type) {
        case 'success':
            iconColorClass = 'text-green-500';
            borderColorClass = 'border-green-500';
            break;
        case 'error':
            iconColorClass = 'text-red-500';
            borderColorClass = 'border-red-500';
            break;
        case 'warning':
            iconColorClass = 'text-yellow-500';
            borderColorClass = 'border-yellow-500';
            break;
        // Default 'info' colors are already set
    }

    useEffect(() => {
        if (duration) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [onClose, duration]);

    return (
        <div className="animate-in slide-in-from-top fixed top-4 right-4 z-[100] w-auto max-w-sm">
            <Card className={`border-l-4 shadow-lg ${borderColorClass}`}>
                <CardHeader className="p-4">
                    {' '}
                    {/* Adjusted padding */}
                    <div className="flex items-start space-x-3">
                        <IconComponent className={`h-5 w-5 ${iconColorClass} mt-0.5 flex-shrink-0`} />
                        <div className="flex-1">
                            <CardTitle className="text-sm font-semibold">{message}</CardTitle>
                            {description && <CardDescription className="mt-1 text-xs">{description}</CardDescription>}
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="-mt-1 -mr-1 h-6 w-6 flex-shrink-0">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
};

export default CustomToast;
