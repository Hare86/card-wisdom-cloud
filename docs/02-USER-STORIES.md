# User Story Document
## Credit Card Reward Intelligence Dashboard

| Document Information | |
|---------------------|---|
| **Document Version** | 1.1 |
| **Last Updated** | February 4, 2026 |
| **Author** | Product Team |
| **Status** | Approved |

---

## Table of Contents
1. [Product Vision](#1-product-vision)
2. [User Personas](#2-user-personas)
3. [Epic Overview](#3-epic-overview)
4. [User Stories](#4-user-stories)
5. [Acceptance Criteria](#5-acceptance-criteria)
6. [User Journey Maps](#6-user-journey-maps)

---

## 1. Product Vision

### 1.1 Vision Statement
To empower credit card users to maximize their rewards through intelligent tracking, AI-powered insights, and seamless redemption recommendations.

### 1.2 Product Goals
- **G1:** Aggregate rewards across multiple credit cards in one dashboard
- **G2:** Automatically extract transactions from uploaded statements
- **G3:** Provide AI-powered redemption recommendations
- **G4:** Alert users about expiring points and opportunities
- **G5:** Enable natural language queries about rewards

---

## 2. User Personas

### 2.1 Primary Persona: Reward Optimizer (Rahul)

| Attribute | Description |
|-----------|-------------|
| **Age** | 32 |
| **Occupation** | IT Professional |
| **Cards Owned** | 4 (HDFC Infinia, Amex Platinum, Axis Atlas, ICICI Emeralde) |
| **Monthly Spend** | ₹1.5L - ₹2.5L |
| **Pain Points** | Tracking points across cards, missing expiry dates, suboptimal redemptions |
| **Goals** | Maximize point value, never miss expiring points, know best card per category |
| **Tech Savvy** | High |

### 2.2 Secondary Persona: Casual User (Priya)

| Attribute | Description |
|-----------|-------------|
| **Age** | 28 |
| **Occupation** | Marketing Manager |
| **Cards Owned** | 2 (HDFC MoneyBack, Amazon Pay ICICI) |
| **Monthly Spend** | ₹50K - ₹80K |
| **Pain Points** | Doesn't understand point values, overwhelmed by card benefits |
| **Goals** | Simple cashback tracking, easy-to-understand recommendations |
| **Tech Savvy** | Medium |

### 2.3 Power User Persona: Points Enthusiast (Vikram)

| Attribute | Description |
|-----------|-------------|
| **Age** | 45 |
| **Occupation** | Business Owner |
| **Cards Owned** | 7+ premium cards |
| **Monthly Spend** | ₹5L+ |
| **Pain Points** | Complex transfer partner strategies, tracking annual benefits |
| **Goals** | Transfer point arbitrage, maximize lounge visits, track all perks |
| **Tech Savvy** | Very High |

---

## 3. Epic Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRODUCT EPICS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  EPIC 1         │  │  EPIC 2         │  │  EPIC 3         │             │
│  │  User Account   │  │  Card & Points  │  │  Document       │             │
│  │  Management     │  │  Management     │  │  Processing     │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  EPIC 4         │  │  EPIC 5         │  │  EPIC 6         │             │
│  │  AI Chat &      │  │  Alerts &       │  │  Analytics &    │             │
│  │  Recommendations│  │  Notifications  │  │  Reporting      │             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. User Stories

### EPIC 1: User Account Management

#### US-1.1: User Registration
**As a** new user  
**I want to** create an account with my email  
**So that** I can securely access my reward dashboard

| ID | US-1.1 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 5 |
| **Sprint** | Sprint 1 |

**Acceptance Criteria:**
- [ ] User can register with email and password
- [ ] Password must meet security requirements (8+ chars, upper, lower, number)
- [ ] Email verification is sent after registration
- [ ] User cannot access dashboard until email is verified
- [ ] Error messages are clear and actionable

---

#### US-1.2: User Login
**As a** registered user  
**I want to** log in to my account  
**So that** I can access my saved cards and data

| ID | US-1.2 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 3 |
| **Sprint** | Sprint 1 |

**Acceptance Criteria:**
- [ ] User can log in with email and password
- [ ] Invalid credentials show appropriate error
- [ ] Session persists across browser refreshes
- [ ] "Forgot password" flow is available
- [ ] User is redirected to dashboard on success

---

#### US-1.3: User Logout
**As a** logged-in user  
**I want to** log out of my account  
**So that** my data remains secure on shared devices

| ID | US-1.3 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 1 |
| **Sprint** | Sprint 1 |

**Acceptance Criteria:**
- [ ] Logout button is visible in the UI
- [ ] Session is cleared on logout
- [ ] User is redirected to login page
- [ ] Protected routes are inaccessible after logout

---

### EPIC 2: Card & Points Management

#### US-2.1: View Card Portfolio
**As a** user with multiple cards  
**I want to** see all my cards in one dashboard  
**So that** I can get an overview of my rewards

| ID | US-2.1 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 8 |
| **Sprint** | Sprint 2 |

**Acceptance Criteria:**
- [ ] Dashboard displays all user's credit cards
- [ ] Each card shows: bank name, card name, last 4 digits, points balance
- [ ] Total points across all cards is calculated
- [ ] Total estimated value is displayed
- [ ] Cards are visually distinct (different colors/variants)
- [ ] User can click a card to see detailed benefits

---

#### US-2.2: View Card Benefits
**As a** card holder  
**I want to** see the specific benefits of my selected card  
**So that** I know what perks I can use

| ID | US-2.2 |
|----|--------|
| **Priority** | P1 (Should Have) |
| **Story Points** | 5 |
| **Sprint** | Sprint 2 |

**Acceptance Criteria:**
- [ ] Benefits tabs show: Reward Rates, Best Redemption, Perks, Rules, Q&A
- [ ] Reward rates display category multipliers (e.g., "5x on Travel")
- [ ] Best redemption shows optimal point usage
- [ ] Perks list lounge access, insurance, etc.
- [ ] Rules explain point expiry, caps, exclusions
- [ ] Q&A provides quick answers to common questions

---

#### US-2.3: Select Active Card
**As a** user with multiple cards  
**I want to** select a specific card from my portfolio  
**So that** I can see its specific details and recommendations

| ID | US-2.3 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 3 |
| **Sprint** | Sprint 2 |

**Acceptance Criteria:**
- [ ] Cards are displayed in a horizontal carousel
- [ ] Clicking a card selects it visually
- [ ] Benefits section updates to show selected card's data
- [ ] Recommendations update based on selected card
- [ ] Category breakdown updates for selected card
- [ ] Selection persists during session

---

#### US-2.4: View Spending Categories
**As a** user  
**I want to** see my spending broken down by category  
**So that** I understand where my points come from

| ID | US-2.4 |
|----|--------|
| **Priority** | P1 (Should Have) |
| **Story Points** | 5 |
| **Sprint** | Sprint 3 |

**Acceptance Criteria:**
- [ ] Category breakdown shows top spending categories
- [ ] Each category shows: name, amount spent, points earned
- [ ] Visual progress bars indicate relative spending
- [ ] Data updates based on selected card
- [ ] Categories include: Travel, Dining, Shopping, Groceries, Fuel, Other

---

### EPIC 3: Document Processing

#### US-3.1: Upload PDF Statement
**As a** user  
**I want to** upload my credit card statement PDF  
**So that** my transactions can be automatically extracted

| ID | US-3.1 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 8 |
| **Sprint** | Sprint 3 |

**Acceptance Criteria:**
- [ ] Drag-and-drop upload area is visible
- [ ] Click to browse files is available
- [ ] Only PDF files are accepted
- [ ] File size limit of 10MB is enforced
- [ ] Upload progress is shown
- [ ] Success/error toast notifications appear
- [ ] Uploaded files appear in document list

---

#### US-3.2: Select Card for Statement
**As a** user  
**I want to** select which card the statement belongs to  
**So that** transactions are correctly categorized

| ID | US-3.2 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 2 |
| **Sprint** | Sprint 3 |

**Acceptance Criteria:**
- [ ] Card selection dropdown is available
- [ ] Dropdown lists supported cards (HDFC, Axis, ICICI, Amex)
- [ ] "Other Card" option is available for unsupported cards
- [ ] Selected card is used during parsing
- [ ] Selection persists for batch uploads

---

#### US-3.3: Parse Statement with AI
**As a** user  
**I want to** parse my uploaded statement using AI  
**So that** transactions are extracted automatically

| ID | US-3.3 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 13 |
| **Sprint** | Sprint 4 |

**Acceptance Criteria:**
- [ ] "Parse with AI" button is available for unparsed documents
- [ ] Loading state shows during parsing (10-30 seconds)
- [ ] Toast notification indicates parsing progress
- [ ] Parsed documents show transaction count
- [ ] Parsed documents show points earned
- [ ] PII is automatically masked before AI processing
- [ ] Parsing status is clearly indicated (parsed/unparsed)

---

#### US-3.4: PII Data Protection
**As a** user  
**I want** my sensitive data to be automatically masked  
**So that** my personal information is protected

| ID | US-3.4 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 8 |
| **Sprint** | Sprint 4 |

**Acceptance Criteria:**
- [ ] Credit card numbers are masked (XXXX-XXXX-XXXX-1234)
- [ ] PAN numbers are masked (XXXXX****X)
- [ ] Aadhaar numbers are masked
- [ ] Email addresses are partially hidden
- [ ] Phone numbers are masked
- [ ] Security notice is displayed to user
- [ ] PII masking count is shown after parsing

---

#### US-3.5: Delete Uploaded Document
**As a** user  
**I want to** delete an uploaded document  
**So that** I can remove incorrect or outdated statements

| ID | US-3.5 |
|----|--------|
| **Priority** | P1 (Should Have) |
| **Story Points** | 2 |
| **Sprint** | Sprint 4 |

**Acceptance Criteria:**
- [ ] Delete button is visible for each document
- [ ] Confirmation is not required (immediate delete)
- [ ] Document is removed from storage
- [ ] Document is removed from database
- [ ] Associated transactions are retained
- [ ] Success toast confirms deletion

---

### EPIC 4: AI Chat & Recommendations

#### US-4.1: Ask Questions via Chat
**As a** user  
**I want to** ask questions about my rewards in natural language  
**So that** I can get quick answers without navigating the app

| ID | US-4.1 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 13 |
| **Sprint** | Sprint 5 |

**Acceptance Criteria:**
- [ ] Chat interface is accessible from dashboard
- [ ] Text input accepts natural language questions
- [ ] Send button submits the question
- [ ] Responses stream in real-time (typing effect)
- [ ] Chat history is maintained during session
- [ ] Suggested follow-up questions are provided
- [ ] Error states are handled gracefully

---

#### US-4.2: Context-Aware Responses
**As a** user  
**I want** the AI to know about my cards and transactions  
**So that** answers are personalized to my situation

| ID | US-4.2 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 8 |
| **Sprint** | Sprint 5 |

**Acceptance Criteria:**
- [ ] AI uses uploaded document context in responses
- [ ] AI knows about user's specific cards
- [ ] AI references user's transaction patterns
- [ ] AI provides card-specific redemption advice
- [ ] Responses cite relevant benefits when applicable

---

#### US-4.3: View AI Recommendations
**As a** user  
**I want to** see AI-generated recommendations  
**So that** I know how to maximize my rewards

| ID | US-4.3 |
|----|--------|
| **Priority** | P1 (Should Have) |
| **Story Points** | 5 |
| **Sprint** | Sprint 5 |

**Acceptance Criteria:**
- [ ] Recommendations panel is visible on dashboard
- [ ] Recommendations are specific to selected card
- [ ] Each recommendation shows: title, action, value estimate
- [ ] Recommendations update when card selection changes
- [ ] Loading state is shown while generating

---

#### US-4.4: Provide Feedback on Responses
**As a** user  
**I want to** rate AI responses as helpful or not  
**So that** the system can improve over time

| ID | US-4.4 |
|----|--------|
| **Priority** | P2 (Nice to Have) |
| **Story Points** | 3 |
| **Sprint** | Sprint 6 |

**Acceptance Criteria:**
- [ ] Thumbs up/down buttons on AI responses
- [ ] Feedback is recorded in database
- [ ] Visual confirmation of feedback submission
- [ ] Feedback can be changed

---

### EPIC 5: Alerts & Notifications

#### US-5.1: View Active Alerts
**As a** user  
**I want to** see important alerts about my rewards  
**So that** I don't miss opportunities or deadlines

| ID | US-5.1 |
|----|--------|
| **Priority** | P1 (Should Have) |
| **Story Points** | 5 |
| **Sprint** | Sprint 6 |

**Acceptance Criteria:**
- [ ] Alerts panel is visible on dashboard
- [ ] Alerts show: title, description, priority
- [ ] Alerts are color-coded by priority (warning, info)
- [ ] Expiring points alerts show days remaining
- [ ] Milestone alerts show progress
- [ ] Alerts can be dismissed/marked as read

---

#### US-5.2: Expiring Points Warning
**As a** user  
**I want to** be alerted when points are expiring soon  
**So that** I can redeem them before they're lost

| ID | US-5.2 |
|----|--------|
| **Priority** | P0 (Must Have) |
| **Story Points** | 3 |
| **Sprint** | Sprint 6 |

**Acceptance Criteria:**
- [ ] Expiring points are shown in stats card
- [ ] Alert is created for points expiring within 30 days
- [ ] Alert shows exact points count
- [ ] Alert shows days until expiry
- [ ] User can click to see redemption options

---

### EPIC 6: Analytics & Reporting

#### US-6.1: View Transaction History
**As a** user  
**I want to** see all my parsed transactions  
**So that** I can review my spending and earnings

| ID | US-6.1 |
|----|--------|
| **Priority** | P1 (Should Have) |
| **Story Points** | 5 |
| **Sprint** | Sprint 7 |

**Acceptance Criteria:**
- [ ] Transactions page lists all transactions
- [ ] Each transaction shows: date, merchant, amount, category, points
- [ ] Transactions can be filtered by card
- [ ] Transactions can be sorted by date/amount
- [ ] Pagination handles large datasets
- [ ] Search functionality is available

---

#### US-6.2: View Analytics Dashboard
**As a** power user  
**I want to** see detailed analytics about system usage  
**So that** I can understand AI cost and performance

| ID | US-6.2 |
|----|--------|
| **Priority** | P2 (Nice to Have) |
| **Story Points** | 8 |
| **Sprint** | Sprint 7 |

**Acceptance Criteria:**
- [ ] Analytics page shows token usage over time
- [ ] Cache hit rate is displayed
- [ ] Model usage breakdown is visible
- [ ] Response quality metrics are shown
- [ ] Cost estimates are provided

---

## 5. Acceptance Criteria Summary

### Definition of Done (DoD)
For any user story to be considered complete:

- [ ] Code is written and passes linting
- [ ] Unit tests achieve >80% coverage
- [ ] Integration tests pass
- [ ] Code is reviewed and approved
- [ ] Accessibility requirements are met
- [ ] Mobile responsiveness is verified
- [ ] Security review completed (if applicable)
- [ ] Documentation updated
- [ ] Product owner accepts the story

### Priority Definitions

| Priority | Definition | Commitment |
|----------|------------|------------|
| P0 | Must Have | Required for MVP |
| P1 | Should Have | Expected for launch |
| P2 | Nice to Have | If time permits |
| P3 | Future | Post-launch consideration |

---

## 6. User Journey Maps

### 6.1 New User Onboarding Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEW USER ONBOARDING JOURNEY                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │ Landing │───>│ Sign Up │───>│ Verify  │───>│ Upload  │───>│Dashboard│  │
│  │  Page   │    │ Form    │    │ Email   │    │Statement│    │ View    │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│       │              │              │              │              │         │
│   Discover      Enter email    Click link    Drop PDF      See cards      │
│   product       & password     in email      file          & points       │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Emotions:  Curious → Hopeful → Satisfied → Excited → Delighted            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Statement Upload Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       STATEMENT UPLOAD JOURNEY                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Step 1          Step 2          Step 3          Step 4          Step 5    │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │Navigate │───>│ Select  │───>│ Upload  │───>│ Parse   │───>│ Review  │  │
│  │to Upload│    │ Card    │    │  PDF    │    │ with AI │    │ Results │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                                              │
│  User Action:                                                                │
│  Click Upload   Choose HDFC   Drag & drop   Click Parse   See 42 txns      │
│  in sidebar     Infinia       statement     button        extracted        │
│                                                                              │
│  System:                                                                     │
│  Show page      Update        Upload to     Mask PII,     Display          │
│                 selection     storage       call AI       summary          │
│                                                                              │
│  ─────────────────────────────────────────────────────────────────────────  │
│  Time:  Instant    2 sec        5 sec        15-30 sec      Instant        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.3 AI Chat Interaction Journey

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AI CHAT INTERACTION JOURNEY                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐  │
│  │  Open   │───>│  Type   │───>│  Send   │───>│ Read    │───>│ Follow  │  │
│  │  Chat   │    │Question │    │ Query   │    │Response │    │   Up    │  │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘    └─────────┘  │
│                                                                              │
│  User:                                                                       │
│  "How do I       System         User sees     Gets          Clicks         │
│  maximize        checks         streaming     actionable    suggested      │
│  my points?"     cache          response      advice        question       │
│                                                                              │
│  System Flow:                                                                │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Query → Cache Check → RAG Context → Model Selection → Stream → Log │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Appendix: Story Point Reference

| Points | Complexity | Example |
|--------|------------|---------|
| 1 | Trivial | Add a button, fix typo |
| 2 | Simple | Add form field, simple validation |
| 3 | Small | New component with existing patterns |
| 5 | Medium | New feature with moderate complexity |
| 8 | Large | Feature with multiple components |
| 13 | Complex | Major feature with AI integration |
| 21 | Epic | Should be broken down |

---

*End of User Story Document*
