# CreditPulse 💳
### Credit Intelligence & Loan Diagnostics

**Understand your credit health. Discover what holds you back. Take smarter financial steps.**

CreditPulse is a smart credit risk simulator designed to help users better understand their financial health, explore their loan eligibility, and identify the factors that may affect their chances of getting a loan.

Instead of leaving users confused about why a loan application might be rejected, CreditPulse offers a more transparent, interactive, and educational experience through simulated credit scoring, financial analysis, personalized improvement plans, and AI-powered assistance.

> CreditPulse is an educational financial simulation tool. It does not generate official credit scores or guarantee loan approval.

---

## 🌐 Live Project

| Resource | Link |
|---|---|
| 🚀 Live Website | [creditpulse.ai.studio](https://creditpulse.ai.studio/) |
| 💻 GitHub Repository | [credit_pulse](https://github.com/Debjit-Bera/credit_pulse) |
| 🎥 Project Demo | [Watch the Demo on Loom](https://www.loom.com/share/d83120fc30ce40cbae2ba4863bf9722f) |

---

## 📌 The Problem

Many people apply for loans without fully understanding their financial standing or what lenders consider before approving an application.

A person may face rejection because of high existing debt, insufficient repayment capacity, unstable financial circumstances, or other factors. However, these reasons are often difficult to understand, especially for individuals who are new to credit or financial planning.

This lack of transparency makes it difficult for users to:

- Understand their current financial health.
- Identify potential reasons for loan rejection.
- Estimate their repayment capacity.
- Know what they should improve before applying again.
- Compare financial options with greater confidence.

## 💡 Our Solution

CreditPulse aims to make financial insights more understandable and accessible.

By entering their financial information, users can explore a simulated credit assessment, understand possible risk factors, receive actionable suggestions, calculate EMIs, and interact with an AI assistant for financial guidance.

Our goal is not simply to provide a score, but to help users understand **why their financial profile looks a certain way and what they can do to improve it.**

---

## ✨ Key Features

### 1. Smart Credit Score
Generate a simulated credit score based on the user's financial profile and understand the factors contributing to the result.

- Simulated credit score
- Financial health overview
- Risk assessment
- Score breakdown and insights

### 2. Loan Diagnostics & Rejection Analysis
Explore potential reasons why a loan application might be rejected.

- Identify possible financial risk factors
- Analyze loan-related concerns
- Understand potential weaknesses in the financial profile
- Get clearer insights into possible rejection reasons

### 3. Personalized Improvement Roadmap
Receive a structured improvement plan designed to help users build healthier financial habits.

- Personalized financial suggestions
- Actionable improvement steps
- Progress-oriented guidance
- Three-month financial improvement roadmap

### 4. AI Financial Assistant
An AI-powered assistant that helps users understand financial concepts and their CreditPulse results.

- Ask finance-related questions
- Understand credit and loan concepts
- Get contextual guidance based on financial assessment
- Learn how to improve financial health

### 5. Alternative Loan Suggestions
Explore alternative borrowing options based on the user's financial situation.

- Discover alternative loan possibilities
- Explore different borrowing options
- Make more informed comparisons

### 6. EMI Calculator
Calculate estimated monthly loan repayments before making borrowing decisions.

- Monthly EMI calculation
- Total repayment amount
- Interest payable
- Compare different loan amounts, interest rates, and repayment periods

### 7. Financial Dashboard
A central dashboard that brings important financial insights together.

- Overview of financial profile
- Credit assessment summary
- Loan analysis
- Improvement plans
- Financial activity overview

### 8. Financial Profile Management
Maintain a personal financial profile to make the assessment experience more convenient.

- Manage financial information
- Update profile details
- Reuse saved information across relevant features

### 9. Document Vault
A dedicated space for managing financial documents within the application.

- Upload and manage documents
- Access saved documents
- Keep financial documentation organized

---

## 🛠️ Technology Stack

CreditPulse is built using modern web technologies, with a focus on a responsive user experience, maintainable code, and integrated backend services.

| Technology | Purpose |
|---|---|
| **React 19** | Component-based user interface |
| **TypeScript** | Type-safe application development |
| **Tailwind CSS 4** | Responsive styling and UI design |
| **Vite** | Development server and build tooling |
| **Firebase Authentication** | User authentication and sign-in |
| **Cloud Firestore** | User profiles and application data |
| **Firebase Storage** | File and document storage infrastructure |
| **Google Gemini API** | AI-powered financial assistant |
| **Node.js** | JavaScript runtime |
| **Express.js** | Backend server functionality |
| **Lucide React** | Icons |
| **Motion** | Animations and interactive UI effects |

---

## 🔐 Authentication & Data Security

CreditPulse uses Firebase services to support authentication and user-specific data storage.

- Email/password authentication
- Google sign-in
- Email verification
- User-specific financial profiles
- Firestore-based data management
- Firestore security rules
- Protected user data access
- Document storage support

The application is designed to restrict access to private user information and enforce authenticated access through Firebase security rules.

Security rules and application configuration should be reviewed and properly configured before production deployment.

---

## 📸 Application Modules

| Module | Description |
|---|---|
| Dashboard | Overview of the user's financial insights |
| Smart Credit Score | Simulated credit score and breakdown |
| Loan Diagnostics | Potential rejection reasons and risk analysis |
| 3-Month Roadmap | Personalized improvement guidance |
| Alternative Loans | Alternative borrowing options |
| EMI Calculator | Monthly repayment calculations |
| AI Assistant | AI-powered financial assistance |
| Document Vault | Financial document management |
| Financial Profile | Profile and financial data management |

---

## 🚀 Getting Started

Follow these steps to run CreditPulse locally.

### Prerequisites

Make sure you have installed:

- [Node.js](https://nodejs.org/) (recommended: recent LTS version)
- npm
- A Firebase project
- A Gemini API key

### 1. Clone the Repository

```bash
git clone https://github.com/Debjit-Bera/credit_pulse.git
```

### 2. Navigate to the Project Directory

```bash
cd credit_pulse
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory using `.env.example` as a reference.

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

Add the required Firebase project configuration and enable the authentication providers and Firebase services required by the application.

> Never commit API keys, private credentials, or sensitive configuration values to GitHub.

### 5. Start the Development Server

```bash
npm run dev
```

### 6. Build for Production

```bash
npm run build
```

### 7. Preview the Production Build

```bash
npm run preview
```

---

## 📂 Project Structure

```text
credit_pulse/
│
├── src/
│   ├── components/
│   │   ├── AiAssistantView
│   │   ├── AlternativeLoansView
│   │   ├── AuthView
│   │   ├── DashboardOverview
│   │   ├── DocumentVaultView
│   │   ├── EmiCalculatorView
│   │   ├── ImprovementRoadmapView
│   │   ├── LoanRejectionView
│   │   ├── ProfileView
│   │   └── SmartCreditScoreView
│   │
│   ├── context/
│   │   └── AuthContext
│   │
│   ├── lib/
│   │   └── firestoreService
│   │
│   ├── types/
│   │   └── creditpulse
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env.example
├── firestore.rules
├── firestore.rules.test.ts
├── storage.rules
├── server.ts
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 🎯 Project Objectives

CreditPulse was developed with the following objectives:

- Make financial information easier to understand.
- Promote better financial awareness.
- Help users identify potential loan-related risks.
- Encourage responsible borrowing habits.
- Make financial guidance more accessible.
- Use technology to simplify complex financial concepts.

---

## 🔮 Future Scope

We believe CreditPulse can grow beyond a basic credit simulator. Some potential future improvements include:

- More advanced and personalized risk analysis
- Improved AI-powered financial recommendations
- Interactive credit score improvement tracking
- Enhanced loan comparison tools
- Financial goal planning
- Better visualization of financial trends
- More comprehensive financial education resources
- Additional security and privacy enhancements

---

## ⚠️ Disclaimer

CreditPulse is a project built for educational, demonstration, and financial-awareness purposes.

- Credit scores generated by this application are simulated and are **not official credit scores**.
- The results are not provided by CIBIL, Experian, Equifax, CRIF, or any financial institution.
- Loan eligibility and rejection insights are estimates based on the application's logic.
- Alternative loan suggestions do not represent guaranteed offers.
- EMI calculations are estimates and may not include all fees, charges, taxes, or lender-specific terms.
- CreditPulse does not guarantee loan approval, credit score improvement, or financial outcomes.

Users should consult authorized financial institutions or qualified financial professionals before making important financial decisions.

---

## 🤝 Contributing

Contributions, suggestions, and feedback are always welcome!

If you'd like to contribute:

1. Fork the repository.
2. Create a new branch.

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes.
4. Commit your work.

   ```bash
   git commit -m "Add: your feature description"
   ```

5. Push your branch.

   ```bash
   git push origin feature/your-feature-name
   ```

6. Open a Pull Request.

---

## 👨‍💻 Team & Credits

Built as a hackathon project with the idea of making financial insights more transparent, understandable, and accessible.

We believe technology should not only solve problems, but also help people understand those problems and make better decisions.

---

## ⭐ Support the Project

If you find CreditPulse interesting or useful, consider giving the repository a ⭐ on GitHub.

Every bit of support, feedback, and contribution helps us improve!

---

<p align="center">
  <b>CreditPulse — Know Your Credit. Improve Your Future.</b>
</p>
