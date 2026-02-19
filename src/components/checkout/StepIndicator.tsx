import React from 'react';
import { CheckCircle2, Mail, Truck, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Step = 'contact' | 'shipping' | 'payment' | 'confirmation';

interface StepIndicatorProps {
  currentStep: Step;
  primaryColor?: string;
}

const steps: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: 'contact', label: 'Contacto', icon: Mail },
  { id: 'shipping', label: 'Envío', icon: Truck },
  { id: 'payment', label: 'Pago', icon: CreditCard },
  { id: 'confirmation', label: 'Confirmación', icon: CheckCircle2 },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  primaryColor = '#06B6D4',
}) => {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-center mb-8 px-4">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isActive = step.id === currentStep;
        const isCompleted = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className={cn('flex flex-col items-center', isActive && 'scale-110')}>
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
                style={{
                  backgroundColor: isCompleted
                    ? primaryColor
                    : isActive
                    ? `${primaryColor}20`
                    : '#f3f4f6',
                  color: isCompleted
                    ? 'white'
                    : isActive
                    ? primaryColor
                    : '#9ca3af',
                  ...(isActive ? { boxShadow: `0 0 0 2px ${primaryColor}` } : {}),
                }}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={cn('text-xs mt-1 hidden sm:block', isActive ? 'font-medium' : 'text-gray-500')}
                style={isActive ? { color: primaryColor } : {}}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className="w-12 h-0.5 mx-2"
                style={{ backgroundColor: index < currentIndex ? primaryColor : '#e5e7eb' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default StepIndicator;
