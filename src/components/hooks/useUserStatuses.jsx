import { useState, useEffect } from 'react';
import { UserCustomStatuses } from '@/entities/UserCustomStatuses';
import { User } from '@/entities/User';
import { DEFAULT_STATUSES } from '../utils/statusUtils';

export const useUserStatuses = () => {
  const [userStatuses, setUserStatuses] = useState(DEFAULT_STATUSES);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadUserStatuses();
  }, []);

  const loadUserStatuses = async () => {
    setIsLoading(true);
    try {
      const user = await User.me();
      setCurrentUser(user);
      
      const customStatuses = await UserCustomStatuses.filter({ user_email: user.email });
      
      if (customStatuses.length > 0) {
        setUserStatuses(customStatuses[0].custom_statuses);
      } else {
        setUserStatuses(DEFAULT_STATUSES);
      }
    } catch (error) {
      console.error("שגיאה בטעינת סטטוסים:", error);
      setUserStatuses(DEFAULT_STATUSES);
    }
    setIsLoading(false);
  };

  const refreshStatuses = () => {
    loadUserStatuses();
  };

  return {
    userStatuses,
    isLoading,
    currentUser,
    refreshStatuses
  };
};