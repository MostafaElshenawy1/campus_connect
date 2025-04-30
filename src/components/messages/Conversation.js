import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Avatar,
  CircularProgress,
  IconButton,
  Divider,
  Card,
  CardContent,
  CardActions
} from '@mui/material';
import { Send as SendIcon, AttachMoney as MoneyIcon } from '@mui/icons-material';
import { getMessages, sendMessage, handleOfferResponse, markMessageAsRead } from '../../services/messages';
import { doc, getDoc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { auth } from '../../config/firebase';

const Message = ({ message, isOwnMessage, onOfferResponse }) => {
  const [otherUser, setOtherUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const userId = isOwnMessage ? message.receiverId : message.senderId;
      const userDoc = await getDoc(doc(db, 'users', userId));
      setOtherUser(userDoc.data());
    };
    fetchUser();
  }, [message, isOwnMessage]);

  const messageContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isOwnMessage ? 'flex-end' : 'flex-start',
        maxWidth: '70%'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          mb: 1
        }}
      >
        <Avatar
          src={otherUser?.photoURL}
          alt={otherUser?.displayName}
          sx={{ width: 24, height: 24, mr: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          {otherUser?.displayName}
        </Typography>
      </Box>
      <Paper
        elevation={1}
        sx={{
          p: 2,
          backgroundColor: isOwnMessage ? 'primary.light' : 'grey.100',
          color: isOwnMessage ? 'primary.contrastText' : 'text.primary'
        }}
      >
        {message.isOffer ? (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                Offer: ${message.offerAmount}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {message.content}
              </Typography>
            </CardContent>
            {!isOwnMessage && message.status === 'pending' && (
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => onOfferResponse(message.id, true)}
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => onOfferResponse(message.id, false)}
                >
                  Reject
                </Button>
              </CardActions>
            )}
            {message.status !== 'pending' && (
              <Typography
                variant="caption"
                color={message.status === 'accepted' ? 'success.main' : 'error.main'}
                sx={{ p: 1 }}
              >
                {message.status === 'accepted' ? 'Offer accepted' : 'Offer rejected'}
              </Typography>
            )}
          </Card>
        ) : (
          <Typography>{message.content}</Typography>
        )}
      </Paper>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        {new Date(message.timestamp?.toDate()).toLocaleString()}
      </Typography>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        mb: 2
      }}
    >
      {messageContent}
    </Box>
  );
};

const Conversation = () => {
  const { userId } = useParams();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [otherUser, setOtherUser] = useState(null);
  const [isOffer, setIsOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const msgs = await getMessages(userId);
        setMessages(msgs);

        // Fetch other user's details
        const userDoc = await getDoc(doc(db, 'users', userId));
        setOtherUser(userDoc.data());

        // Mark unread messages as read
        msgs.forEach(async (msg) => {
          if (msg.receiverId === auth.currentUser.uid && !msg.read) {
            await markMessageAsRead(msg.id);
          }
        });
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      await sendMessage(userId, newMessage, null, isOffer, isOffer ? parseFloat(offerAmount) : null);
      setNewMessage('');
      setIsOffer(false);
      setOfferAmount('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleOfferResponse = async (messageId, accept) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const messageDoc = await getDoc(messageRef);

      if (!messageDoc.exists()) {
        throw new Error('Message not found');
      }

      const messageData = messageDoc.data();
      const offerAmount = messageData.offerAmount;

      if (accept) {
        // Create a new message indicating acceptance
        await addDoc(collection(db, 'messages'), {
          conversationId: messageData.conversationId,
          senderId: auth.currentUser.uid,
          receiverId: messageData.senderId,
          content: `Accepted offer of $${offerAmount}`,
          timestamp: serverTimestamp(),
          type: 'offer_response',
          accepted: true,
          offerAmount: offerAmount
        });
      } else {
        // Create a new message indicating rejection
        await addDoc(collection(db, 'messages'), {
          conversationId: messageData.conversationId,
          senderId: auth.currentUser.uid,
          receiverId: messageData.senderId,
          content: `Rejected offer of $${offerAmount}`,
          timestamp: serverTimestamp(),
          type: 'offer_response',
          accepted: false,
          offerAmount: offerAmount
        });
      }

      // Update the original offer message to mark it as responded
      await updateDoc(messageRef, {
        responded: true,
        response: accept ? 'accepted' : 'rejected'
      });

    } catch (error) {
      console.error('Error handling offer response:', error);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center">
          <Avatar src={otherUser?.photoURL} alt={otherUser?.displayName} sx={{ mr: 2 }} />
          <Typography variant="h6">{otherUser?.displayName}</Typography>
        </Box>
      </Paper>

      <Paper
        elevation={2}
        sx={{
          flex: 1,
          mb: 2,
          p: 2,
          overflow: 'auto',
          maxHeight: 'calc(100vh - 300px)'
        }}
      >
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            isOwnMessage={message.senderId === auth.currentUser.uid}
            onOfferResponse={handleOfferResponse}
          />
        ))}
        <div ref={messagesEndRef} />
      </Paper>

      <Paper elevation={2} sx={{ p: 2 }}>
        {isOffer && (
          <TextField
            fullWidth
            label="Offer Amount"
            type="number"
            value={offerAmount}
            onChange={(e) => setOfferAmount(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <MoneyIcon sx={{ mr: 1 }} />,
            }}
          />
        )}
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsOffer(!isOffer)}
            sx={{ minWidth: '100px' }}
          >
            {isOffer ? 'Cancel Offer' : 'Make Offer'}
          </Button>
          <IconButton color="primary" onClick={handleSendMessage}>
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default Conversation;
