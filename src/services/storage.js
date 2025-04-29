import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import { storage } from '../config/firebase';

export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    throw error;
  }
};

export const uploadListingImage = async (file, listingId) => {
  const path = `listings/${listingId}/${file.name}`;
  return uploadFile(file, path);
};

export const uploadUserAvatar = async (file, userId) => {
  const path = `users/${userId}/avatar/${file.name}`;
  return uploadFile(file, path);
};

export const uploadGroupImage = async (file, groupId) => {
  const path = `groups/${groupId}/${file.name}`;
  return uploadFile(file, path);
};

export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    throw error;
  }
};

export const deleteListingImage = async (listingId, fileName) => {
  const path = `listings/${listingId}/${fileName}`;
  return deleteFile(path);
};

export const deleteUserAvatar = async (userId, fileName) => {
  const path = `users/${userId}/avatar/${fileName}`;
  return deleteFile(path);
};

export const deleteGroupImage = async (groupId, fileName) => {
  const path = `groups/${groupId}/${fileName}`;
  return deleteFile(path);
};
