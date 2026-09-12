import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout";
import { ProtectedRoute } from "../components/Guards";

import LibraryDetails from "../pages/user/LibraryDetails";

// Common Pages
import LoginPage from "../pages/common/LoginPage";
import UnauthorizedPage from "../pages/common/UnauthorizedPage";

// User Pages
import ExploreLibraries from "../pages/user/ExploreLibraries";
import SeatBookingView from "../pages/user/SeatBookingView";
import MyPasses from "../pages/user/MyPasses";

// Owner Pages
import OwnerLiveFloor from "../pages/owner/OwnerLiveFloor";
import WalkInDeskAssign from "../pages/owner/WalkInDeskAssign";
import GateQrScanner from "../pages/owner/GateQrScanner";

// Admin Pages
import AdminAnalytics from "../pages/admin/AdminAnalytics";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication & Error Views */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* Main Persistent Layout (Header + Leftbar + Content + Rightbar) */}
      <Route element={<MainLayout />}>
        {/* Default Landing */}
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/explore" element={<ExploreLibraries />} />
        <Route path="/library/:libraryId/book" element={<SeatBookingView />} />

        {/* User / Student Routes */}
        <Route
          element={<ProtectedRoute allowedRoles={["user", "owner", "admin"]} />}
        >
          <Route path="/my-passes" element={<MyPasses />} />
        </Route>

        {/* Owner Routes */}
        <Route element={<ProtectedRoute allowedRoles={["owner", "admin"]} />}>
          <Route path="/owner/live-grid" element={<OwnerLiveFloor />} />
          <Route path="/owner/walk-in" element={<WalkInDeskAssign />} />
          <Route path="/owner/gate-verify" element={<GateQrScanner />} />
        </Route>

        {/* Admin Routes */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route path="/admin/analytics" element={<AdminAnalytics />} />
        </Route>
      </Route>

      <Route path="/explore" element={<ExploreLibraries />} />
      <Route path="/library/:libraryId" element={<LibraryDetails />} />
      <Route path="/library/:libraryId/book" element={<SeatBookingView />} />

      {/* 404 Route */}
      <Route
        path="*"
        element={<div style={{ padding: "20px" }}>404 - View Not Found</div>}
      />
    </Routes>
  );
}
