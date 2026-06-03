/**
 * Chat Slice - Chat and conversation state
 */
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ENDPOINTS } from "../../api/config";
import { api, errorMessage } from "../../api/http";
import type {
    ChatState,
    Conversation,
    Message,
    SendMessageRequest,
} from "../../types";

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  isLoading: false,
  isSending: false,
  isTyping: false,
  error: null,
};

// Async thunks
export const fetchConversations = createAsyncThunk(
  "chat/fetchConversations",
  async (_, { rejectWithValue }) => {
    try {
      return await api.get<Conversation[]>(ENDPOINTS.CHAT.CONVERSATIONS);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

export const fetchConversation = createAsyncThunk(
  "chat/fetchConversation",
  async (conversationId: string, { rejectWithValue }) => {
    try {
      return await api.get<Conversation>(
        ENDPOINTS.CHAT.CONVERSATION(conversationId),
      );
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

export const sendMessage = createAsyncThunk<Message, SendMessageRequest>(
  "chat/sendMessage",
  async (messageData, { rejectWithValue }) => {
    try {
      return await api.post<Message>(ENDPOINTS.CHAT.MESSAGE, messageData);
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

export const sendVoiceMessage = createAsyncThunk(
  "chat/sendVoiceMessage",
  async (audioData: string, { rejectWithValue }) => {
    try {
      return await api.post<Message>(ENDPOINTS.CHAT.VOICE, { audioData });
    } catch (err) {
      return rejectWithValue(errorMessage(err));
    }
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.isTyping = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      if (state.currentConversation) {
        state.currentConversation.messages.push(action.payload);
      }
    },
    createNewConversation: (state) => {
      const newConversation: Conversation = {
        id: `temp-${Date.now()}`,
        userId: "",
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.currentConversation = newConversation;
    },
    clearCurrentConversation: (state) => {
      state.currentConversation = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch conversations
    builder.addCase(fetchConversations.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchConversations.fulfilled, (state, action) => {
      state.isLoading = false;
      state.conversations = action.payload;
    });
    builder.addCase(fetchConversations.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch single conversation
    builder.addCase(fetchConversation.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchConversation.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentConversation = action.payload;
    });
    builder.addCase(fetchConversation.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Send message
    builder.addCase(sendMessage.pending, (state) => {
      state.isSending = true;
      state.error = null;
    });
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      state.isSending = false;
      if (state.currentConversation) {
        // Sync local conversation id with the real one returned by backend
        const realConvId = action.payload.conversationId;
        if (realConvId && state.currentConversation.id !== realConvId) {
          state.currentConversation.id = realConvId;
          // Update senderId on optimistic local user messages too
          state.currentConversation.messages.forEach((m) => {
            if (m.conversationId !== realConvId) m.conversationId = realConvId;
          });
        }
        state.currentConversation.messages.push(action.payload);
      }
    });
    builder.addCase(sendMessage.rejected, (state, action) => {
      state.isSending = false;
      state.error = action.payload as string;
    });

    // Send voice message
    builder.addCase(sendVoiceMessage.pending, (state) => {
      state.isSending = true;
      state.error = null;
    });
    builder.addCase(sendVoiceMessage.fulfilled, (state, action) => {
      state.isSending = false;
      if (state.currentConversation) {
        state.currentConversation.messages.push(action.payload);
      }
    });
    builder.addCase(sendVoiceMessage.rejected, (state, action) => {
      state.isSending = false;
      state.error = action.payload as string;
    });
  },
});

export const {
  clearError,
  setTyping,
  addMessage,
  createNewConversation,
  clearCurrentConversation,
} = chatSlice.actions;
export default chatSlice.reducer;
