# WhatsApp Bot Web Management Interface

A comprehensive web application for managing WhatsApp bot conversations and enabling seamless human-agent handoff when needed. This interface allows agents to monitor, interact with, and manage automated WhatsApp conversations in real-time.

## 🎯 Purpose

This web application serves as a centralized management interface for WhatsApp bot operations, providing:

- **Bot Conversation Monitoring**: Real-time monitoring of automated WhatsApp conversations
- **Human Agent Handoff**: Seamless transition from bot to human agent when complex interactions are required
- **Multi-media Support**: Handle text, images, audio, video, and document messages
- **Lead Management**: Organize and track customer interactions and leads
- **Real-time Communication**: Live chat interface with instant message updates

## ✨ Key Features

### 🤖 Bot Management
- **Conversation Mode Toggle**: Switch between automated bot responses and human agent control
- **Real-time Status Indicators**: Visual indicators showing bot vs human mode for each conversation
- **Automated Response Monitoring**: Track bot performance and conversation flow

### 👥 Human Agent Interface
- **Live Chat Panel**: Real-time messaging interface for human agents
- **Conversation History**: Complete message history with timestamps and delivery status
- **Multi-media Messaging**: Send and receive images, audio recordings, videos, and documents
- **Audio Recording**: Built-in voice message recording and sending capabilities

### 📱 Lead Management
- **Contact List**: Organized list of all customer conversations
- **Search Functionality**: Quick search by contact name or phone number
- **Conversation Status**: Track active, paused, or inactive conversations
- **Recent Activity**: Sort conversations by most recent activity

### 🔄 Real-time Updates
- **Live Message Polling**: Automatic updates for new incoming messages
- **Instant Notifications**: Real-time status updates and message delivery confirmations
- **Session Management**: Automatic session timeout and re-authentication

### 📱 Responsive Design
- **Mobile-First**: Optimized for mobile devices with responsive layout
- **Desktop Support**: Full-featured desktop interface
- **Cross-Platform**: Works on all modern browsers and devices

## 🛠 Technology Stack

### Frontend Technologies
- **React 19.1.1**: Modern React with latest features and hooks
- **Tailwind CSS 3.4.17**: Utility-first CSS framework for responsive design
- **JavaScript ES6+**: Modern JavaScript with async/await and modules

### Audio & Media Processing
- **Opus Media Recorder 0.8.0**: High-quality audio recording and encoding
- **Web Audio API**: Browser-native audio processing
- **File Upload Support**: Drag-and-drop file uploads for multimedia

### Development Tools
- **Create React App 5.0.1**: React development environment and build tools
- **PostCSS 8.5.6**: CSS processing and optimization
- **Autoprefixer 10.4.21**: Automatic vendor prefixing
- **ESLint**: Code linting and quality assurance

### Testing Framework
- **React Testing Library 16.3.0**: Component testing utilities
- **Jest DOM 6.8.0**: Custom Jest matchers for DOM testing
- **User Event 13.5.0**: User interaction simulation for testing

### Deployment & CI/CD
- **GitHub Pages**: Static site hosting
- **GitHub Actions**: Automated build and deployment pipeline
- **Azure Functions**: Backend API integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn package manager
- Modern web browser with JavaScript enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Daniel-dadu/whatsapp-bot-web.git
   cd whatsapp-bot-web
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```env
   REACT_APP_LOGIN_ENDPOINT=your_login_endpoint
   REACT_APP_CONVERSATION_MODE_ENDPOINT=your_conversation_mode_endpoint
   REACT_APP_GET_CONVERSATION_ENDPOINT=your_get_conversation_endpoint
   REACT_APP_GET_RECENT_MESSAGES_ENDPOINT=your_recent_messages_endpoint
   REACT_APP_GET_RECENT_LEADS_ENDPOINT=your_recent_leads_endpoint
   REACT_APP_SEND_AGENT_MESSAGE_ENDPOINT=your_send_message_endpoint
   REACT_APP_NEXT_CONVERSATIONS_ENDPOINT=your_next_conversations_endpoint
   REACT_APP_GET_MULTIMEDIA_ENDPOINT=your_multimedia_endpoint
   REACT_APP_WHATSAPP_TOKEN=your_whatsapp_token
   REACT_APP_PHONE_NUMBER_ID=your_phone_number_id
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📋 Available Scripts

### `npm start`
Runs the app in development mode. The page will reload when you make changes and show lint errors in the console.

### `npm test`
Launches the test runner in interactive watch mode. See the [running tests](https://facebook.github.io/create-react-app/docs/running-tests) documentation for more information.

### `npm run build`
Builds the app for production to the `build` folder. It correctly bundles React in production mode and optimizes the build for the best performance.

### `npm run eject`
**Note: This is a one-way operation. Once you eject, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can eject at any time. This command will remove the single build dependency from your project.

## 🌐 API Integration

The application integrates with a backend API system that provides:

### Authentication Endpoints
- **Login**: User authentication with JWT tokens
- **Token Management**: Automatic token refresh and session handling

### Conversation Management
- **Get Conversations**: Retrieve recent customer conversations
- **Get Conversation History**: Load complete message history for a conversation
- **Send Messages**: Send text and multimedia messages to customers
- **Mode Switching**: Toggle between bot and human agent modes

### Multimedia Support
- **File Upload**: Upload images, audio, video, and documents to Facebook Graph API
- **Media Retrieval**: Download and display multimedia content from WhatsApp
- **Audio Recording**: Record and send voice messages

### Real-time Features
- **Message Polling**: Continuous polling for new messages
- **Status Updates**: Real-time delivery and read status updates
- **Activity Tracking**: User activity monitoring and session management

## 🏗 Project Structure

```
src/
├── components/           # React components
│   ├── ChatApp.js       # Main chat application
│   ├── ChatPanel.js     # Chat interface and messaging
│   ├── ConversationList.js # Contact and conversation list
│   ├── LoginScreen.js   # Authentication interface
│   ├── AudioRecorder.js # Voice message recording
│   ├── AudioPlayer.js   # Audio playback component
│   ├── ImageMessage.js  # Image message display
│   ├── VideoMessage.js  # Video message display
│   └── DocumentMessage.js # Document message display
├── contexts/            # React context providers
│   ├── AuthContext.js   # Authentication state management
│   └── MessagesContext.js # Message and conversation state
├── services/            # API service layer
│   ├── apiService.js    # Backend API integration
│   ├── contactsService.js # Contact management
│   └── messagesService.js # Message handling
└── utils/               # Utility functions
    └── phoneFormatter.js # Phone number formatting
```

## 🔧 Configuration

### Environment Variables
All API endpoints and configuration are managed through environment variables:

- **API Endpoints**: Configure backend service URLs
- **WhatsApp Integration**: Facebook Graph API credentials
- **Authentication**: JWT token configuration
- **Media Handling**: File upload and retrieval settings

### Build Configuration
The application uses Create React App with custom configurations:

- **Tailwind CSS**: Utility-first styling
- **PostCSS**: CSS processing and optimization
- **ESLint**: Code quality and consistency
- **Jest**: Testing framework configuration

## 🚀 Deployment

### GitHub Pages
The application is automatically deployed to GitHub Pages using GitHub Actions:

1. **Automatic Deployment**: Pushes to main branch trigger deployment
2. **Environment Variables**: Secrets are managed through GitHub repository settings
3. **Build Process**: Automated build and optimization for production

### Manual Deployment
For custom deployment:

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the build folder**
   Upload the contents of the `build` folder to your web server


## 📄 License

This project is private and proprietary. All rights reserved.

---

**Built with ❤️ using React and modern web technologies**
