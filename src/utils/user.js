const users = [];

export const userJoin = ({ id, roomId, socketId }) => {
  // 1. Check if this specific socket is already in the room
  const existingUser = users.find((user) => user.id === id);

  // 2. If they exist, verify if they are just re-joining the same room
  if (existingUser) {
    // If room matches, return existing user (don't add duplicate)
    if (existingUser.roomId === roomId) {
        return existingUser;
    } 
    // If they moved rooms, remove the old entry (optional, depends on app logic)
    // For now, let's just assume we return the existing one to stop duplicates
    return existingUser;
  }

  // 3. If new, add them
  const user = { id, roomId, socketId };
  users.push(user);
  return user;
};

// ... keep userLeave and getUsers the same
export const userLeave = (socketId) => {
  const index = users.findIndex((user) => user.socketId === socketId);
  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

export const getUsers = (roomId) => {
  return users.filter((user) => user.roomId === roomId);
};