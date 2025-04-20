import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Bell, MessageSquare, Send } from 'lucide-react';

// Mock data - replace with actual API call
const mockMessages = [
  {
    id: 1,
    type: 'announcement',
    title: 'Holiday Schedule Update',
    content: 'The office will be closed on Monday, January 1st, 2024.',
    date: '2024-01-01',
    sender: 'System Admin'
  },
  {
    id: 2,
    type: 'message',
    title: 'Shift Change Request',
    content: 'Your shift change request has been approved.',
    date: '2024-01-02',
    sender: 'Shift Manager'
  }
];

const Messages = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState(mockMessages);
  const [newMessage, setNewMessage] = useState('');
  const [selectedTab, setSelectedTab] = useState<'all' | 'announcements' | 'messages'>('all');

  const filteredMessages = messages.filter(message => {
    if (selectedTab === 'all') return true;
    return message.type === selectedTab;
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Mock sending message - replace with actual API call
    const message = {
      id: messages.length + 1,
      type: 'message',
      title: 'New Message',
      content: newMessage,
      date: new Date().toISOString().split('T')[0],
      sender: user?.full_name || 'Unknown'
    };

    setMessages([message, ...messages]);
    setNewMessage('');
    toast({
      title: "Success",
      description: "Message sent successfully",
    });
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Messages & Announcements</CardTitle>
          <CardDescription>View and send messages to your team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex space-x-2">
              <Button
                variant={selectedTab === 'all' ? 'default' : 'outline'}
                onClick={() => setSelectedTab('all')}
              >
                All
              </Button>
              <Button
                variant={selectedTab === 'announcements' ? 'default' : 'outline'}
                onClick={() => setSelectedTab('announcements')}
              >
                <Bell className="h-4 w-4 mr-2" />
                Announcements
              </Button>
              <Button
                variant={selectedTab === 'messages' ? 'default' : 'outline'}
                onClick={() => setSelectedTab('messages')}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Messages
              </Button>
            </div>

            <form onSubmit={handleSendMessage} className="space-y-2">
              <Textarea
                placeholder="Type your message here..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button type="submit">
                  <Send className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
              </div>
            </form>

            <div className="space-y-4">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{message.title}</h3>
                      <p className="text-sm text-gray-500">{message.content}</p>
                      <div className="mt-2 text-xs text-gray-400">
                        From: {message.sender} • {message.date}
                      </div>
                    </div>
                    {message.type === 'announcement' ? (
                      <Bell className="h-5 w-5 text-blue-500" />
                    ) : (
                      <MessageSquare className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Messages; 