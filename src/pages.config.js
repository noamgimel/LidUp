import ClientStatusSettings from './pages/ClientStatusSettings';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import GoogleAuthSuccess from './pages/GoogleAuthSuccess';
import Home from './pages/Home';
import Integrations from './pages/Integrations';
import MasterAdminDashboard from './pages/MasterAdminDashboard';
import Meetings from './pages/Meetings';
import NoAccess from './pages/NoAccess';
import Reports from './pages/Reports';
import SelectWorkspace from './pages/SelectWorkspace';
import Settings from './pages/Settings';
import WorkStageSettings from './pages/WorkStageSettings';
import WorkspaceManagement from './pages/WorkspaceManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "ClientStatusSettings": ClientStatusSettings,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "GoogleAuthSuccess": GoogleAuthSuccess,
    "Home": Home,
    "Integrations": Integrations,
    "MasterAdminDashboard": MasterAdminDashboard,
    "Meetings": Meetings,
    "NoAccess": NoAccess,
    "Reports": Reports,
    "SelectWorkspace": SelectWorkspace,
    "Settings": Settings,
    "WorkStageSettings": WorkStageSettings,
    "WorkspaceManagement": WorkspaceManagement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};