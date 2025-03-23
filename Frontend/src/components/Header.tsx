import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, User, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format } from 'date-fns';

interface Notification {
  id: number;
  message: string;
  timestamp: string;
  read: boolean;
}

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackClick?: () => void;
  notifications?: Notification[];
}

const Header: React.FC<HeaderProps> = ({ 
  title, 
  showBackButton = false, 
  onBackClick,
  notifications = [] 
}) => {
  const { logout } = useAuth();
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false);
  const unreadNotifications = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button variant="ghost" size="icon" onClick={onBackClick} className="mr-1">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-medium">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative"
                onClick={() => setIsNotificationDialogOpen(true)}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
            </div>
            <Link to="/profile" className="text-pocketfarm-primary">
              <User className="h-5 w-5" />
            </Link>
            <Button variant="ghost" size="icon" className="text-pocketfarm-gray" onClick={() => logout()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Notifications</DialogTitle>
            <DialogDescription>View your recent notifications and updates.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-lg ${
                    notification.read ? 'bg-gray-50' : 'bg-blue-50'
                  }`}
                >
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {format(new Date(notification.timestamp), 'MMM dd, yyyy h:mm a')}
                  </p>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No notifications
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header; 