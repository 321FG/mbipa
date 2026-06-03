/**
 * Session Slice - Live therapy sessions state
 */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  SessionState, 
  Therapist, 
  LiveSession, 
  BookSessionRequest 
} from '../../types';
import { API_URL, ENDPOINTS } from '../../api/config';

const initialState: SessionState = {
  therapists: [],
  sessions: [],
  currentSession: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchTherapists = createAsyncThunk(
  'session/fetchTherapists',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string } };
      const response = await fetch(`${API_URL}${ENDPOINTS.SESSIONS.THERAPISTS}`, {
        headers: {
          'Authorization': `Bearer ${state.auth.accessToken}`,
        },
      });
      
      if (!response.ok) {
        return rejectWithValue('Erreur lors du chargement des psychologues');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Erreur réseau');
    }
  }
);

export const bookSession = createAsyncThunk<LiveSession, BookSessionRequest>(
  'session/bookSession',
  async (bookingData, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string } };
      const response = await fetch(`${API_URL}${ENDPOINTS.SESSIONS.BOOK}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.auth.accessToken}`,
        },
        body: JSON.stringify(bookingData),
      });
      
      if (!response.ok) {
        return rejectWithValue('Erreur lors de la réservation');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Erreur réseau');
    }
  }
);

export const fetchUpcomingSessions = createAsyncThunk(
  'session/fetchUpcoming',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string } };
      const response = await fetch(`${API_URL}${ENDPOINTS.SESSIONS.UPCOMING}`, {
        headers: {
          'Authorization': `Bearer ${state.auth.accessToken}`,
        },
      });
      
      if (!response.ok) {
        return rejectWithValue('Erreur lors du chargement des sessions');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Erreur réseau');
    }
  }
);

export const joinSession = createAsyncThunk(
  'session/joinSession',
  async (sessionId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string } };
      const response = await fetch(`${API_URL}${ENDPOINTS.SESSIONS.JOIN(sessionId)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.auth.accessToken}`,
        },
      });
      
      if (!response.ok) {
        return rejectWithValue('Erreur lors de la connexion à la session');
      }
      
      return await response.json();
    } catch (error) {
      return rejectWithValue('Erreur réseau');
    }
  }
);

export const rateSession = createAsyncThunk(
  'session/rateSession',
  async ({ sessionId, rating }: { sessionId: string; rating: number }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { accessToken: string } };
      const response = await fetch(`${API_URL}${ENDPOINTS.SESSIONS.RATE(sessionId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.auth.accessToken}`,
        },
        body: JSON.stringify({ rating }),
      });
      
      if (!response.ok) {
        return rejectWithValue('Erreur lors de la notation');
      }
      
      return { sessionId, rating };
    } catch (error) {
      return rejectWithValue('Erreur réseau');
    }
  }
);

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentSession: (state, action: PayloadAction<LiveSession | null>) => {
      state.currentSession = action.payload;
    },
    updateSessionStatus: (state, action: PayloadAction<{ id: string; status: LiveSession['status'] }>) => {
      const session = state.sessions.find(s => s.id === action.payload.id);
      if (session) {
        session.status = action.payload.status;
      }
      if (state.currentSession?.id === action.payload.id) {
        state.currentSession.status = action.payload.status;
      }
    },
  },
  extraReducers: (builder) => {
    // Fetch therapists
    builder.addCase(fetchTherapists.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchTherapists.fulfilled, (state, action) => {
      state.isLoading = false;
      state.therapists = action.payload;
    });
    builder.addCase(fetchTherapists.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    
    // Book session
    builder.addCase(bookSession.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(bookSession.fulfilled, (state, action) => {
      state.isLoading = false;
      state.sessions.push(action.payload);
    });
    builder.addCase(bookSession.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    
    // Fetch upcoming sessions
    builder.addCase(fetchUpcomingSessions.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchUpcomingSessions.fulfilled, (state, action) => {
      state.isLoading = false;
      state.sessions = action.payload;
    });
    builder.addCase(fetchUpcomingSessions.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    
    // Join session
    builder.addCase(joinSession.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(joinSession.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentSession = action.payload;
    });
    builder.addCase(joinSession.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });
    
    // Rate session
    builder.addCase(rateSession.fulfilled, (state, action) => {
      const session = state.sessions.find(s => s.id === action.payload.sessionId);
      if (session) {
        session.rating = action.payload.rating;
      }
    });
  },
});

export const { clearError, setCurrentSession, updateSessionStatus } = sessionSlice.actions;
export default sessionSlice.reducer;
