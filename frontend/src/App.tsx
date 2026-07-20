import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleRoute } from './components/RoleRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyHome from './pages/MyHome';
import ClientHome from './pages/ClientHome';
import CreateProject from './pages/CreateProject';
import ProjectList from './pages/ProjectList';
import Splash from './pages/Splash';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CreateTask from './pages/CreateTask';
import TaskList from './pages/TaskList';
import TaskDetails from './pages/TaskDetails';
import ProjectProgressPage from './pages/ProjectProgress';
import ProjectDocumentsPage from './pages/ProjectDocuments';
import LeavePage from './pages/LeavePage';
import LeaveAttendancePage from './pages/LeaveAttendancePage';
import MyLeavePage from './pages/MyLeavePage';
import HolidaysPage from './pages/HolidaysPage';
import ReportsPage from './pages/ReportsPage';
import CreateEmployee from './pages/CreateEmployee';
import Profile from './pages/Profile';
import NotificationsPage from './pages/NotificationsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/reset_password" element={<ResetPassword />} />
        <Route path="/reset_password/:token" element={<ResetPassword />} />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RoleRoute roles={['ADMIN', 'HR', 'PROJECT_MANAGER', 'TEAM_LEAD']}>
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="/my-home"
          element={
            <RoleRoute roles={['EMPLOYEE']}>
              <MyHome />
            </RoleRoute>
          }
        />
        <Route
          path="/client-home"
          element={
            <RoleRoute roles={['CLIENT']}>
              <ClientHome />
            </RoleRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <ProjectList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId/documents"
          element={
            <ProtectedRoute>
              <ProjectDocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ProtectedRoute>
              <ProjectProgressPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <TaskList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/user/:userId"
          element={
            <ProtectedRoute>
              <TaskList />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/:id"
          element={
            <ProtectedRoute>
              <TaskDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-project"
          element={
            <RoleRoute roles={['ADMIN']}>
              <CreateProject />
            </RoleRoute>
          }
        />
        <Route
          path="/create-task"
          element={
            <ProtectedRoute>
              <CreateTask />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave"
          element={
            <RoleRoute roles={['ADMIN', 'HR']}>
              <LeavePage />
            </RoleRoute>
          }
        />
        <Route
          path="/leave/attendance"
          element={
            <RoleRoute roles={['ADMIN', 'HR']}>
              <LeaveAttendancePage />
            </RoleRoute>
          }
        />
        <Route
          path="/leave/holidays"
          element={
            <RoleRoute roles={['ADMIN', 'HR']}>
              <HolidaysPage />
            </RoleRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleRoute roles={['ADMIN', 'HR', 'PROJECT_MANAGER']}>
              <ReportsPage />
            </RoleRoute>
          }
        />
        <Route
          path="/create-employee"
          element={
            <RoleRoute roles={['ADMIN']}>
              <CreateEmployee />
            </RoleRoute>
          }
        />
        <Route
          path="/my-leave"
          element={
            <RoleRoute roles={['EMPLOYEE', 'PROJECT_MANAGER', 'TEAM_LEAD']}>
              <MyLeavePage />
            </RoleRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
