# Test Case Document
## Credit Card Reward Intelligence Dashboard

| Document Information | |
|---------------------|---|
| **Document Version** | 1.1 |
| **Last Updated** | February 4, 2026 |
| **Author** | QA Team |
| **Status** | Approved |
| **Test Environment** | Preview & Production |

---

## Table of Contents
1. [Test Strategy Overview](#1-test-strategy-overview)
2. [Test Environment Setup](#2-test-environment-setup)
3. [Functional Test Cases](#3-functional-test-cases)
4. [Integration Test Cases](#4-integration-test-cases)
5. [Security Test Cases](#5-security-test-cases)
6. [Performance Test Cases](#6-performance-test-cases)
7. [Accessibility Test Cases](#7-accessibility-test-cases)
8. [Mobile Responsiveness Tests](#8-mobile-responsiveness-tests)
9. [Edge Function Tests](#9-edge-function-tests)
10. [Regression Test Suite](#10-regression-test-suite)

---

## 1. Test Strategy Overview

### 1.1 Testing Pyramid

```
                    ┌───────────┐
                   ╱│   E2E    │╲        5%
                  ╱ │  Tests   │ ╲
                 ╱  └───────────┘  ╲
                ╱  ┌─────────────┐  ╲     15%
               ╱   │ Integration │   ╲
              ╱    │   Tests     │    ╲
             ╱     └─────────────┘     ╲
            ╱    ┌─────────────────┐    ╲   80%
           ╱     │   Unit Tests    │     ╲
          ╱      └─────────────────┘      ╲
         ╱─────────────────────────────────╲
```

### 1.2 Test Categories

| Category | Coverage Target | Tools |
|----------|-----------------|-------|
| Unit Tests | 80% | Vitest |
| Integration | Key flows | Vitest + Supabase |
| E2E | Critical paths | Browser Tools |
| Security | All endpoints | Manual + Automated |
| Performance | Key metrics | Browser DevTools |
| Accessibility | WCAG 2.1 AA | axe-core |

### 1.3 Test Data Management

| Data Type | Strategy | Notes |
|-----------|----------|-------|
| Test Users | Dedicated test accounts | Never use production |
| Mock Data | Factories with realistic values | See test fixtures |
| PDFs | Sample statements in `/public/test-data/` | PII-free samples |

---

## 2. Test Environment Setup

### 2.1 Prerequisites

```bash
# Install dependencies
bun install

# Run unit tests
bun run test

# Run with coverage
bun run test:coverage
```

### 2.2 Test Configuration

**File:** `vitest.config.ts`
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
```

### 2.3 Test Credentials

| Environment | Email | Password | Purpose |
|-------------|-------|----------|---------|
| Test | test@example.com | TestPassword123! | Standard testing |
| Test | demo@example.com | DemoPassword123! | Demo scenarios |

---

## 3. Functional Test Cases

### 3.1 Authentication Module

#### TC-AUTH-001: User Registration

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-AUTH-001 |
| **Title** | User Registration with Valid Credentials |
| **Priority** | P0 - Critical |
| **Type** | Functional |
| **Prerequisite** | User is not registered |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth` | Auth page loads with Sign Up tab |
| 2 | Enter valid email: `newuser@test.com` | Email field accepts input |
| 3 | Enter valid password: `SecurePass123!` | Password field accepts input |
| 4 | Click "Sign Up" button | Loading state appears |
| 5 | Wait for response | Success message: "Check your email" |
| 6 | Check email inbox | Verification email received |

**Expected Result:** User account created, verification email sent.

**Screenshot Reference:** Auth page sign-up form

---

#### TC-AUTH-002: User Login - Valid Credentials

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-AUTH-002 |
| **Title** | User Login with Valid Credentials |
| **Priority** | P0 - Critical |
| **Type** | Functional |
| **Prerequisite** | User is registered and verified |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth` | Auth page loads |
| 2 | Select "Sign In" tab | Sign in form displayed |
| 3 | Enter email: `test@example.com` | Email accepted |
| 4 | Enter password: `TestPassword123!` | Password accepted |
| 5 | Click "Sign In" | Loading state appears |
| 6 | Wait for redirect | Dashboard loads at `/` |

**Expected Result:** User logged in, redirected to dashboard.

---

#### TC-AUTH-003: User Login - Invalid Credentials

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-AUTH-003 |
| **Title** | User Login with Invalid Credentials |
| **Priority** | P0 - Critical |
| **Type** | Negative |
| **Prerequisite** | None |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/auth` | Auth page loads |
| 2 | Enter email: `wrong@example.com` | Email accepted |
| 3 | Enter password: `wrongpassword` | Password accepted |
| 4 | Click "Sign In" | Loading state appears |
| 5 | Wait for response | Error toast: "Invalid credentials" |

**Expected Result:** Login fails, error message displayed, user remains on auth page.

---

#### TC-AUTH-004: Protected Route Access

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-AUTH-004 |
| **Title** | Unauthenticated User Access to Dashboard |
| **Priority** | P0 - Critical |
| **Type** | Security |
| **Prerequisite** | User is not logged in |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear browser session | Session cleared |
| 2 | Navigate directly to `/` | Redirect to `/auth` |
| 3 | Navigate directly to `/upload` | Redirect to `/auth` |
| 4 | Navigate directly to `/transactions` | Redirect to `/auth` |
| 5 | Navigate directly to `/analytics` | Redirect to `/auth` |

**Expected Result:** All protected routes redirect to auth page.

---

### 3.2 Dashboard Module

#### TC-DASH-001: Dashboard Load with Cards

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-DASH-001 |
| **Title** | Dashboard Displays User's Credit Cards |
| **Priority** | P0 - Critical |
| **Type** | Functional |
| **Prerequisite** | User logged in, has cards in database |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login with test user | Dashboard loads |
| 2 | Observe "Your Cards" section | Cards carousel visible |
| 3 | Count visible cards | Matches database count |
| 4 | Check card details | Bank name, card name, points visible |
| 5 | Check total stats | Total points calculated correctly |

**Expected Result:** Dashboard shows all user's cards with accurate data.

**Screenshot Reference:** Dashboard main view

---

#### TC-DASH-002: Card Selection

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-DASH-002 |
| **Title** | Select Card and Update Benefits |
| **Priority** | P1 - High |
| **Type** | Functional |
| **Prerequisite** | User logged in, has multiple cards |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and view dashboard | First card is selected by default |
| 2 | Click on second card | Second card gets selected state |
| 3 | Observe Benefits tabs | Benefits update to second card |
| 4 | Observe Recommendations | Recommendations update |
| 5 | Observe Category Breakdown | Categories update |

**Expected Result:** Selecting a card updates all related sections.

---

#### TC-DASH-003: Stats Cards Display

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-DASH-003 |
| **Title** | Stats Cards Show Accurate Data |
| **Priority** | P1 - High |
| **Type** | Functional |
| **Prerequisite** | User logged in with cards |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login to dashboard | Stats cards visible |
| 2 | Verify "Total Points" | Matches sum of all card points |
| 3 | Verify "Total Value" | Points × 0.40 rate |
| 4 | Verify "Monthly Earned" | Shows current month earnings |
| 5 | Verify "Expiring Soon" | Shows points expiring in 15 days |

**Expected Result:** All stats cards show accurate, calculated values.

---

### 3.3 Upload Module

#### TC-UPLOAD-001: PDF Upload via Drag-Drop

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-UPLOAD-001 |
| **Title** | Upload PDF via Drag and Drop |
| **Priority** | P0 - Critical |
| **Type** | Functional |
| **Prerequisite** | User logged in |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/upload` | Upload page loads |
| 2 | Select card type from dropdown | Card selected |
| 3 | Drag PDF file over drop zone | Drop zone highlights |
| 4 | Drop PDF file | Upload starts |
| 5 | Wait for upload | Progress shown |
| 6 | Observe completion | Success toast, file in list |

**Expected Result:** PDF uploaded successfully, appears in document list.

**Screenshot Reference:** Upload page with drop zone

---

#### TC-UPLOAD-002: PDF Upload via Click

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-UPLOAD-002 |
| **Title** | Upload PDF via File Browser |
| **Priority** | P0 - Critical |
| **Type** | Functional |
| **Prerequisite** | User logged in |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/upload` | Upload page loads |
| 2 | Click on drop zone | File browser opens |
| 3 | Select PDF file | File selected |
| 4 | Wait for upload | Upload progress shown |
| 5 | Observe completion | Success toast, file in list |

**Expected Result:** PDF uploaded via file browser.

---

#### TC-UPLOAD-003: Reject Non-PDF Files

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-UPLOAD-003 |
| **Title** | Reject Non-PDF File Upload |
| **Priority** | P1 - High |
| **Type** | Negative |
| **Prerequisite** | User logged in |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/upload` | Upload page loads |
| 2 | Drag a .docx file to drop zone | Drop zone highlights |
| 3 | Drop the file | Error toast appears |
| 4 | Verify error message | "Please upload PDF files only" |
| 5 | Verify file list | No file added |

**Expected Result:** Non-PDF files rejected with clear error message.

---

#### TC-UPLOAD-004: Parse PDF with AI

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-UPLOAD-004 |
| **Title** | Parse Uploaded PDF with AI |
| **Priority** | P0 - Critical |
| **Type** | Functional |
| **Prerequisite** | User logged in, PDF uploaded |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/upload` | See unparsed document |
| 2 | Click "Parse with AI" button | Button shows loading |
| 3 | Wait for parsing (10-30 sec) | Progress toast shown |
| 4 | Observe completion | Success toast with details |
| 5 | Verify parsed data | Transaction count, points shown |
| 6 | Verify PII masking count | Masked fields count shown |

**Expected Result:** PDF parsed, transactions extracted, PII masked.

---

#### TC-UPLOAD-005: Delete Uploaded Document

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-UPLOAD-005 |
| **Title** | Delete an Uploaded Document |
| **Priority** | P1 - High |
| **Type** | Functional |
| **Prerequisite** | User logged in, has uploaded document |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to `/upload` | See uploaded documents |
| 2 | Click delete icon on a document | Document removed immediately |
| 3 | Observe toast | "File deleted" confirmation |
| 4 | Refresh page | Document not in list |

**Expected Result:** Document deleted from storage and database.

---

### 3.4 Chat Module

#### TC-CHAT-001: Send Chat Message

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-CHAT-001 |
| **Title** | Send Message and Receive Streaming Response |
| **Priority** | P0 - Critical |
| **Type** | Functional |
| **Prerequisite** | User logged in |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to dashboard | Chat interface visible |
| 2 | Click chat input | Input focused |
| 3 | Type "How do I redeem points?" | Text appears in input |
| 4 | Click send (or Enter) | Message sent, loading state |
| 5 | Observe response | Response streams in character-by-character |
| 6 | Wait for completion | Full response displayed |
| 7 | Observe follow-up questions | Suggested questions appear |

**Expected Result:** Message sent, streaming response received, follow-ups shown.

---

#### TC-CHAT-002: Context-Aware Response

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-CHAT-002 |
| **Title** | AI Provides Context-Aware Response |
| **Priority** | P1 - High |
| **Type** | Functional |
| **Prerequisite** | User logged in, has parsed documents |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Ask "What cards do I have?" | Response mentions user's actual cards |
| 2 | Ask "What's my best redemption option?" | Response is specific to user's cards |
| 3 | Ask "How many points am I earning on dining?" | Response references user's card rates |

**Expected Result:** AI responses are personalized to user's data.

---

#### TC-CHAT-003: Chat Error Handling

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-CHAT-003 |
| **Title** | Handle Chat API Errors Gracefully |
| **Priority** | P1 - High |
| **Type** | Negative |
| **Prerequisite** | User logged in |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Simulate network error | Error toast appears |
| 2 | Verify error message | Clear, user-friendly message |
| 3 | Verify chat state | Input remains enabled |
| 4 | Retry message | Can resend after error |

**Expected Result:** Errors handled gracefully, user can retry.

---

## 4. Integration Test Cases

### 4.1 Database Integration

#### TC-INT-001: Card Data Persistence

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-INT-001 |
| **Title** | Credit Cards Persist Across Sessions |
| **Priority** | P0 - Critical |
| **Type** | Integration |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login and upload statement | Card created |
| 2 | Logout | Session cleared |
| 3 | Login again | Same cards appear |
| 4 | Verify card data | Points, name unchanged |

**Expected Result:** Data persists correctly in database.

---

#### TC-INT-002: Transaction Data Integrity

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-INT-002 |
| **Title** | Parsed Transactions Match Statement |
| **Priority** | P0 - Critical |
| **Type** | Integration |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload known test statement | Statement uploaded |
| 2 | Parse with AI | Transactions extracted |
| 3 | Navigate to `/transactions` | Transaction list visible |
| 4 | Compare with source statement | Amounts, dates match |
| 5 | Verify category assignment | Categories are reasonable |

**Expected Result:** Extracted transactions match source document.

---

### 4.2 Edge Function Integration

#### TC-INT-003: RAG Chat End-to-End

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-INT-003 |
| **Title** | RAG Chat Full Flow Test |
| **Priority** | P0 - Critical |
| **Type** | Integration |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | User with documents asks question | Request sent to rag-chat |
| 2 | Verify cache check | Cache checked first |
| 3 | Verify context retrieval | Documents retrieved |
| 4 | Verify model selection | Appropriate model chosen |
| 5 | Verify streaming | Response streams back |
| 6 | Verify caching | Response cached for future |
| 7 | Verify logging | Token usage logged |

**Expected Result:** Full RAG pipeline executes correctly.

---

## 5. Security Test Cases

### 5.1 Authentication Security

#### TC-SEC-001: SQL Injection Prevention

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-SEC-001 |
| **Title** | Prevent SQL Injection in Login |
| **Priority** | P0 - Critical |
| **Type** | Security |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter email: `' OR '1'='1` | Input accepted |
| 2 | Enter password: `' OR '1'='1` | Input accepted |
| 3 | Submit form | Login fails safely |
| 4 | Verify no error exposure | Generic error message |

**Expected Result:** SQL injection attempt fails, no data exposed.

---

#### TC-SEC-002: XSS Prevention

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-SEC-002 |
| **Title** | Prevent XSS in Chat Input |
| **Priority** | P0 - Critical |
| **Type** | Security |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enter chat message: `<script>alert('xss')</script>` | Message sent |
| 2 | Observe chat display | Script rendered as text |
| 3 | Verify no execution | No alert dialog |

**Expected Result:** Script tags escaped, not executed.

---

### 5.2 Data Security

#### TC-SEC-003: PII Masking Verification

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-SEC-003 |
| **Title** | Verify PII is Masked in Documents |
| **Priority** | P0 - Critical |
| **Type** | Security |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload statement with known PII | File uploaded |
| 2 | Parse with AI | Parsing completes |
| 3 | Query document_chunks table | Check stored content |
| 4 | Verify credit card numbers | Masked as XXXX-XXXX-XXXX-1234 |
| 5 | Verify PAN numbers | Masked appropriately |
| 6 | Verify email addresses | Partially hidden |

**Expected Result:** All PII properly masked before storage.

---

#### TC-SEC-004: RLS Policy Enforcement

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-SEC-004 |
| **Title** | Row Level Security Prevents Cross-User Access |
| **Priority** | P0 - Critical |
| **Type** | Security |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as User A | Dashboard shows User A data |
| 2 | Note User B's card ID | For testing |
| 3 | Attempt direct DB query for User B data | Query fails or returns empty |
| 4 | Attempt API call for User B data | Request denied |

**Expected Result:** Users cannot access other users' data.

---

## 6. Performance Test Cases

### 6.1 Load Time Tests

#### TC-PERF-001: Dashboard Initial Load

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-PERF-001 |
| **Title** | Dashboard Loads Within Acceptable Time |
| **Priority** | P1 - High |
| **Type** | Performance |
| **Threshold** | FCP < 1.5s, TTI < 3s |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Clear browser cache | Cache cleared |
| 2 | Open DevTools Performance | Recording ready |
| 3 | Navigate to dashboard | Page loads |
| 4 | Stop recording | Metrics captured |
| 5 | Verify FCP | < 1.5 seconds |
| 6 | Verify TTI | < 3 seconds |
| 7 | Verify LCP | < 2.5 seconds |

**Expected Result:** All Core Web Vitals within acceptable range.

---

#### TC-PERF-002: Chat Response Time

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-PERF-002 |
| **Title** | Chat First Token Within 1 Second |
| **Priority** | P1 - High |
| **Type** | Performance |
| **Threshold** | First token < 1s |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open chat interface | Chat ready |
| 2 | Send simple question | Request sent |
| 3 | Start timer | Timer running |
| 4 | Stop when first token appears | Time recorded |
| 5 | Verify time | < 1 second |

**Expected Result:** First response token within 1 second.

---

### 6.2 PDF Processing Performance

#### TC-PERF-003: PDF Parse Time

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-PERF-003 |
| **Title** | PDF Parsing Completes Within 30 Seconds |
| **Priority** | P1 - High |
| **Type** | Performance |
| **Threshold** | Parse < 30s for typical statement |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload 5-page test statement | File uploaded |
| 2 | Start timer, click Parse | Parsing begins |
| 3 | Wait for completion | Parsing finishes |
| 4 | Stop timer | Time recorded |
| 5 | Verify time | < 30 seconds |

**Expected Result:** Typical statement parses within 30 seconds.

---

## 7. Accessibility Test Cases

### 7.1 WCAG 2.1 AA Compliance

#### TC-A11Y-001: Keyboard Navigation

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-A11Y-001 |
| **Title** | All Interactive Elements Keyboard Accessible |
| **Priority** | P1 - High |
| **Type** | Accessibility |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to dashboard with Tab key | All elements reachable |
| 2 | Verify focus indicators | Visible focus ring |
| 3 | Navigate card carousel | Cards selectable via keyboard |
| 4 | Access chat input | Input focusable |
| 5 | Submit chat via Enter | Message sends |
| 6 | Navigate sidebar links | Links accessible |

**Expected Result:** Full keyboard navigation possible.

---

#### TC-A11Y-002: Screen Reader Compatibility

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-A11Y-002 |
| **Title** | Screen Reader Announces Content Correctly |
| **Priority** | P1 - High |
| **Type** | Accessibility |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable screen reader | SR active |
| 2 | Navigate to dashboard | Page title announced |
| 3 | Navigate cards | Card details read aloud |
| 4 | Navigate stats | Stats values announced |
| 5 | Use chat | Messages announced |

**Expected Result:** Screen reader announces all content meaningfully.

---

#### TC-A11Y-003: Color Contrast

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-A11Y-003 |
| **Title** | Color Contrast Meets WCAG AA |
| **Priority** | P1 - High |
| **Type** | Accessibility |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run axe-core audit | Audit completes |
| 2 | Check text contrast | Ratio ≥ 4.5:1 |
| 3 | Check large text | Ratio ≥ 3:1 |
| 4 | Check interactive elements | Visible in all states |

**Expected Result:** All contrast ratios meet WCAG AA standards.

---

## 8. Mobile Responsiveness Tests

### 8.1 Viewport Tests

#### TC-MOBILE-001: iPhone Display

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-MOBILE-001 |
| **Title** | Dashboard Displays Correctly on iPhone |
| **Priority** | P1 - High |
| **Type** | Responsiveness |
| **Viewport** | 390×844 |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 390×844 | Mobile view |
| 2 | Verify mobile navigation | Hamburger menu visible |
| 3 | Verify card carousel | Horizontal scrollable |
| 4 | Verify stats grid | 2-column layout |
| 5 | Verify chat interface | Full width |
| 6 | Verify touch targets | ≥ 44×44 pixels |

**Expected Result:** Dashboard fully functional on iPhone.

---

#### TC-MOBILE-002: Tablet Display

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-MOBILE-002 |
| **Title** | Dashboard Displays Correctly on iPad |
| **Priority** | P1 - High |
| **Type** | Responsiveness |
| **Viewport** | 768×1024 |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Set viewport to 768×1024 | Tablet view |
| 2 | Verify layout | Appropriate column widths |
| 3 | Verify sidebar | May be visible or collapsed |
| 4 | Verify card sizes | Properly sized |

**Expected Result:** Dashboard adapts properly to tablet.

---

## 9. Edge Function Tests

### 9.1 rag-chat Function

#### TC-EDGE-001: rag-chat Cache Hit

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-EDGE-001 |
| **Title** | RAG Chat Returns Cached Response |
| **Priority** | P1 - High |
| **Type** | Integration |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send unique question | Response generated |
| 2 | Wait for cache storage | Response cached |
| 3 | Send identical question | Response returns faster |
| 4 | Verify response contains `cached: true` | Cache hit confirmed |

**Expected Result:** Repeated queries served from cache.

---

#### TC-EDGE-002: rag-chat Model Selection

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-EDGE-002 |
| **Title** | Correct Model Selected by Task Type |
| **Priority** | P1 - High |
| **Type** | Unit |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Send chat query | gemini-2.5-flash used |
| 2 | Send analysis query | gemini-3-flash or gemini-2.5-pro used |
| 3 | Verify in token_usage logs | Correct model logged |

**Expected Result:** Model selection matches task type.

---

### 9.2 parse-pdf Function

#### TC-EDGE-003: PDF Parse PII Masking

| Field | Value |
|-------|-------|
| **Test Case ID** | TC-EDGE-003 |
| **Title** | parse-pdf Masks All PII Types |
| **Priority** | P0 - Critical |
| **Type** | Unit |

**Test Steps:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Parse PDF with credit card number | Number masked |
| 2 | Parse PDF with PAN | PAN masked |
| 3 | Parse PDF with email | Email partially hidden |
| 4 | Parse PDF with phone | Phone masked |
| 5 | Verify pii_masking_log | All types logged |

**Expected Result:** All PII types properly masked.

---

## 10. Regression Test Suite

### 10.1 Critical Path Tests

Run before each deployment:

| ID | Test Case | Priority |
|----|-----------|----------|
| TC-AUTH-002 | User Login | P0 |
| TC-AUTH-004 | Protected Routes | P0 |
| TC-DASH-001 | Dashboard Load | P0 |
| TC-UPLOAD-001 | PDF Upload | P0 |
| TC-UPLOAD-004 | PDF Parse | P0 |
| TC-CHAT-001 | Chat Message | P0 |
| TC-SEC-004 | RLS Enforcement | P0 |

### 10.2 Smoke Test Checklist

Quick validation (5 minutes):

- [ ] Can access login page
- [ ] Can log in with test credentials
- [ ] Dashboard loads with data
- [ ] Can navigate to all pages
- [ ] Chat responds to messages
- [ ] Can log out

### 10.3 Full Regression Suite

Complete validation (2 hours):

- All P0 test cases
- All P1 test cases
- Performance baselines
- Accessibility audit
- Mobile responsiveness check

---

## Appendix: Test Execution Log Template

| Date | Tester | Environment | Test Case | Result | Notes |
|------|--------|-------------|-----------|--------|-------|
| YYYY-MM-DD | Name | Preview | TC-XXX-XXX | Pass/Fail | Comments |

---

*End of Test Case Document*
