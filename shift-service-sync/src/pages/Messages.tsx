import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Bell, MessageSquare, Send, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi, shiftsApi, notificationsApi } from '@/lib/api';
import { usersApi } from '@/lib/users';
import { format, parseISO, isAfter } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { User, Employee } from '@/lib/types';

interface ChatMessage {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
  shift_id?: number;
  sender_name: string;
}

interface Chat {
  id: string;
  employeeId: string;
  employeeName: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
}

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const notificationSound = useRef<HTMLAudioElement | null>(null);

  // Calculate total unread messages
  const totalUnreadMessages = useMemo(() => 
    chats.reduce((total, chat) => total + chat.unreadCount, 0),
    [chats]
  );

  useEffect(() => {
    // Create audio element for notification sound
    notificationSound.current = new Audio('/preview.mp3');
  }, []);

  // Function to play notification sound
  const playNotificationSound = () => {
    if (notificationSound.current) {
      notificationSound.current.play().catch(error => {
        console.error('Failed to play notification sound:', error);
      });
    }
  };

  // Function to handle new messages
  const handleNewMessage = (message: ChatMessage) => {
    // Update chat history if the chat is selected
    queryClient.invalidateQueries({ queryKey: ['chat_history', selectedChat] });
    
    // Update unread count and last message
    setChats(prev => {
      const chatId = `${message.sender_id}-${message.receiver_id}`;
      const reverseChatId = `${message.receiver_id}-${message.sender_id}`;
      
      // Check if this is a message for the current user
      const isForCurrentUser = message.receiver_id === parseInt(user?.id || '0');
      
      // Don't increment unread count if the chat is currently selected
      const shouldIncrementUnread = isForCurrentUser && 
        selectedChat !== chatId && 
        selectedChat !== reverseChatId;

      // If the chat exists, update it
      const existingChatIndex = prev.findIndex(
        chat => chat.id === chatId || chat.id === reverseChatId
      );

      if (existingChatIndex >= 0) {
        const updatedChats = [...prev];
        updatedChats[existingChatIndex] = {
          ...updatedChats[existingChatIndex],
          lastMessage: message,
          unreadCount: shouldIncrementUnread 
            ? updatedChats[existingChatIndex].unreadCount + 1 
            : updatedChats[existingChatIndex].unreadCount
        };
        return updatedChats;
      }

      // If it's a new chat, add it
      const newChat = {
        id: chatId,
        employeeId: message.sender_id.toString(),
        employeeName: message.sender_name,
        lastMessage: message,
        unreadCount: shouldIncrementUnread ? 1 : 0
      };
      return [...prev, newChat];
  });

    // Show notification if the message is for the current user and the chat isn't selected
    if (message.receiver_id === parseInt(user?.id || '0') && 
        selectedChat !== `${message.sender_id}-${message.receiver_id}` &&
        selectedChat !== `${message.receiver_id}-${message.sender_id}`) {
      playNotificationSound();
      toast({
        title: `New message from ${message.sender_name}`,
        description: message.content,
        duration: 5000,
      });
    }
  };

  // Fetch employees for chat selection
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: employeesApi.getAll,
  });

  // Fetch users for chat selection
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

  const shouldShowEmployee = (emp: Employee | User) => {
    const notSelf = emp.username !== user?.username;
    const isCurrentUserAdminOrPlanner = user?.roles?.includes('admin') || user?.roles?.includes('planner');
    const isTargetAdminOrPlanner = emp.roles?.includes('admin') || emp.roles?.includes('planner');
    
    // If current user is admin/planner, show all users except self
    if (isCurrentUserAdminOrPlanner) {
      return notSelf;
    }
    
    // If current user is employee, show all admin/planner users
    if (isTargetAdminOrPlanner) {
      return notSelf;
    }
    
    // For employee-to-employee chat, show all employees except self
    return notSelf;
  };

  // Combine users and employees, removing duplicates by username
  const combinedUsers = [...users];
  employees.forEach(emp => {
    if (!combinedUsers.some(u => u.username === emp.username)) {
      combinedUsers.push(emp);
    }
  });

  // Filter employees based on user role
  const filteredEmployees = combinedUsers.filter(shouldShowEmployee);

  // Debug logs
  console.log('Current user:', JSON.stringify(user, null, 2));
  console.log('All users:', JSON.stringify(users, null, 2));
  console.log('All employees:', JSON.stringify(employees, null, 2));
  console.log('Combined users (no duplicates):', JSON.stringify(combinedUsers, null, 2));
  console.log('Filtered employees:', JSON.stringify(filteredEmployees, null, 2));

  // Fetch shifts for the selected employee
  const { data: shifts = [] } = useQuery({
    queryKey: ['shifts', selectedChat],
    queryFn: () => shiftsApi.getByEmployee(selectedChat?.split('-')[1] || ''),
    enabled: !!selectedChat,
  });

  // Get the next/current shift for the selected employee
  const currentShift = shifts?.find(shift => {
    const shiftDate = parseISO(shift.shift_date);
    return isAfter(shiftDate, new Date());
  });

  // Fetch chat history
  const { data: messages = [] } = useQuery({
    queryKey: ['chat_history', selectedChat],
    queryFn: () => selectedChat ? notificationsApi.getChatHistory(parseInt(selectedChat.split('-')[1])) : [],
    enabled: !!selectedChat,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (!selectedChat) throw new Error('No chat selected');
      return notificationsApi.sendChatMessage({
        content,
        receiver_id: parseInt(selectedChat.split('-')[1]),
        shift_id: currentShift?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat_history', selectedChat] });
    setNewMessage('');
    toast({
      title: "Success",
      description: "Message sent successfully",
    });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  });

  // Set up WebSocket connection when user changes
  useEffect(() => {
    if (user) {
      const ws = notificationsApi.connectToChat(user.id, handleNewMessage);
      setWsConnection(ws);

      return () => {
        ws.close();
      };
    }
  }, [user]);

  // Reset unread count when selecting a chat
  const handleSelectChat = (chatId: string) => {
    setSelectedChat(chatId);
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ));
  };

  const handleStartChat = (employeeId: string, employeeName: string) => {
    const chatId = `${user?.id}-${employeeId}`;
    handleSelectChat(chatId);
    setChats(prev => {
      if (!prev.find(chat => chat.id === chatId)) {
        return [...prev, {
          id: chatId,
          employeeId,
          employeeName,
          unreadCount: 0
        }];
      }
      return prev;
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;
    sendMessageMutation.mutate(newMessage);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Messages & Chat</CardTitle>
            <CardDescription>
              {user?.roles?.includes('admin') || user?.roles?.includes('planner')
                ? "Communicate with your team members"
                : "Chat with your planner"}
            </CardDescription>
          </div>
          {totalUnreadMessages > 0 && (
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-muted-foreground animate-bounce" />
              <Badge variant="destructive" className="ml-2">
                {totalUnreadMessages}
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Chat List */}
            <div className="border rounded-lg p-4">
              <div className="mb-4">
                <Select onValueChange={(value) => handleStartChat(value, filteredEmployees.find(e => e.id.toString() === value)?.full_name || '')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Start new chat" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredEmployees.map(employee => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.full_name} ({employee.roles?.includes('admin') ? 'Admin' : 'Employee'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {chats.map(chat => (
              <Button
                    key={chat.id}
                    variant={selectedChat === chat.id ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    <div className="flex-1 text-left">
                      <div>{chat.employeeName}</div>
                      {chat.lastMessage && (
                        <div className="text-xs text-muted-foreground truncate">
                          {chat.lastMessage.content}
                        </div>
                      )}
                    </div>
                    {chat.unreadCount > 0 && (
                      <Badge variant="default" className="ml-2">
                        {chat.unreadCount}
                      </Badge>
                    )}
              </Button>
                ))}
              </div>
            </div>

            {/* Chat Window */}
            <div className="md:col-span-2 border rounded-lg p-4">
              {selectedChat ? (
                <>
                  {currentShift && (
                    <div className="mb-4 p-3 bg-muted rounded-lg">
                      <h3 className="font-medium">Current/Next Shift</h3>
                      <p className="text-sm">
                        {format(parseISO(currentShift.shift_date), 'MMMM d, yyyy')} • {currentShift.start_time} - {currentShift.end_time}
                      </p>
                      <p className="text-sm">Location: {currentShift.location}</p>
                    </div>
                  )}
                  <div className="space-y-4 h-[400px] overflow-y-auto mb-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender_id === user.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <div className="text-xs mb-1">
                            {message.sender_name} • {format(parseISO(message.timestamp), 'HH:mm')}
                          </div>
                          <p>{message.content}</p>
                        </div>
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground">
                        Start a conversation about this shift
                      </div>
                    )}
                  </div>
            <form onSubmit={handleSendMessage} className="space-y-2">
              <Textarea
                placeholder="Type your message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                      <Button 
                        type="submit"
                        disabled={sendMessageMutation.isPending}
                      >
                  <Send className="h-4 w-4 mr-2" />
                        {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </form>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a chat or start a new conversation
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Messages; 