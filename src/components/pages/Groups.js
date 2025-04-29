import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';

function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchGroups = async () => {
    try {
      const groupsRef = collection(db, 'groups');
      const q = query(groupsRef, where('members', 'array-contains', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const groupsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Error loading groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [auth.currentUser]);

  const handleCreateGroup = async () => {
    try {
      const groupsRef = collection(db, 'groups');
      await addDoc(groupsRef, {
        name: newGroupName,
        createdBy: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        createdAt: new Date()
      });
      setCreateDialogOpen(false);
      setNewGroupName('');
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Error creating group');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Typography>Loading...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" component="h1">
          My Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create New Group
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search groups..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {groups.map((group) => (
          <Grid item xs={12} sm={6} md={4} key={group.id}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {group.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {group.members.length} members
              </Typography>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {/* Implement group chat navigation */}}
              >
                Open Chat
              </Button>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)}>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            type="text"
            fullWidth
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default Groups;
