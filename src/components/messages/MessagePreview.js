import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Avatar,
  Badge,
  Chip,
  Divider,
  CircularProgress,
  Paper
} from '@mui/material';
import { getConversations } from '../../services/messages';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatDistanceToNow } from 'date-fns';

const MessagePreview = () => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const convs = await getConversations();
        console.log('Fetched conversations:', convs);

        // Fetch user details and listing details for each conversation
        const conversationsWithDetails = await Promise.all(
          convs.map(async (conv) => {
            // Fetch user details
            const userDoc = await getDoc(doc(db, 'users', conv.userId));
            const userData = userDoc.data();

            // Fetch listing details if available
            let listingData = null;
            if (conv.lastMessage.listingId) {
              try {
                const listingDoc = await getDoc(doc(db, 'listings', conv.lastMessage.listingId));
                if (listingDoc.exists()) {
                  listingData = listingDoc.data();
                }
              } catch (error) {
                console.error('Error fetching listing:', error);
              }
            }

            return {
              ...conv,
              user: userData,
              listing: listingData
            };
          })
        );

        console.log('Conversations with details:', conversationsWithDetails);
        setConversations(conversationsWithDetails);
      } catch (error) {
        console.error('Error fetching conversations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No messages yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          When you send a message or make an offer on a listing, it will appear here.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {conversations.map((conversation) => (
        <Card
          key={conversation.userId}
          elevation={2}
          sx={{
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4
            }
          }}
          onClick={() => navigate(`/messages/${conversation.userId}`)}
        >
          <Box sx={{ display: 'flex', p: 2 }}>
            {/* User Avatar */}
            <Box sx={{ mr: 2 }}>
              <Badge
                color="error"
                badgeContent={conversation.unreadCount}
                invisible={conversation.unreadCount === 0}
              >
                <Avatar
                  src={conversation.user.photoURL}
                  alt={conversation.user.displayName}
                  sx={{ width: 56, height: 56 }}
                >
                  {conversation.user.displayName?.[0]}
                </Avatar>
              </Badge>
            </Box>

            {/* Conversation Details */}
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div">
                  {conversation.user.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {conversation.lastMessage.timestamp?.toDate
                    ? formatDistanceToNow(conversation.lastMessage.timestamp.toDate(), { addSuffix: true })
                    : 'Recently'}
                </Typography>
              </Box>

              {/* Listing Preview if available */}
              {conversation.listing && (
                <Box sx={{ mb: 1 }}>
                  <Chip
                    label={conversation.listing.title}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ mr: 1 }}
                  />
                  <Chip
                    label={`$${conversation.listing.price}`}
                    size="small"
                    color="secondary"
                  />
                </Box>
              )}

              {/* Message Preview */}
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  mb: 1
                }}
              >
                {conversation.lastMessage.isOffer
                  ? `Offer: $${conversation.lastMessage.offerAmount} - ${conversation.lastMessage.content}`
                  : conversation.lastMessage.content}
              </Typography>

              {/* Offer Status if applicable */}
              {conversation.lastMessage.isOffer && conversation.lastMessage.status && (
                <Chip
                  label={conversation.lastMessage.status}
                  size="small"
                  color={
                    conversation.lastMessage.status === 'accepted' ? 'success' :
                    conversation.lastMessage.status === 'rejected' ? 'error' : 'default'
                  }
                  variant="outlined"
                />
              )}
            </Box>

            {/* Listing Image if available */}
            {conversation.listing && conversation.listing.images && conversation.listing.images.length > 0 && (
              <CardMedia
                component="img"
                sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 1 }}
                image={conversation.listing.images[0]}
                alt={conversation.listing.title}
              />
            )}
          </Box>
        </Card>
      ))}
    </Box>
  );
};

export default MessagePreview;
