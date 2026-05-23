"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  auth,
  db,
} from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from "firebase/firestore";

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  followers: string[];
  following: string[];
  createdAt: number;
  updatedAt: number;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data() as UserProfile);
          }
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        console.error("Error fetching user profile:", err);
        setError("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signup = async (
    email: string,
    password: string,
    displayName: string
  ) => {
    try {
      setError(null);
      // Create Firebase auth user
      const { user: newUser } = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user profile in Firestore
      const userProfile: UserProfile = {
        uid: newUser.uid,
        email,
        displayName,
        avatar: "",
        bio: "",
        followers: [],
        following: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await setDoc(doc(db, "users", newUser.uid), userProfile);
      setUserProfile(userProfile);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
      throw err;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const { user: signedInUser } = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Fetch user profile
      const userDoc = await getDoc(doc(db, "users", signedInUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data() as UserProfile);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in");
      throw err;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUser(null);
      setUserProfile(null);
    } catch (err: any) {
      setError(err.message || "Failed to sign out");
      throw err;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      setError(null);
      if (!user) throw new Error("No user logged in");

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Date.now(),
      });

      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              ...updates,
              updatedAt: Date.now(),
            }
          : null
      );
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        error,
        signup,
        login,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
