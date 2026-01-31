# Standard Operating Procedures (SOP)
## Credit Card Reward Intelligence Dashboard

| Document Information | |
|---------------------|---|
| **Document Version** | 1.0 |
| **Last Updated** | January 31, 2026 |
| **Author** | Operations Team |
| **Status** | Approved |
| **Review Cycle** | Quarterly |

---

## Table of Contents
1. [Introduction](#1-introduction)
2. [System Operations](#2-system-operations)
3. [User Management](#3-user-management)
4. [Data Management](#4-data-management)
5. [Security Operations](#5-security-operations)
6. [Incident Response](#6-incident-response)
7. [Backup & Recovery](#7-backup--recovery)
8. [Monitoring & Alerting](#8-monitoring--alerting)
9. [Deployment Procedures](#9-deployment-procedures)
10. [Support Procedures](#10-support-procedures)

---

## 1. Introduction

### 1.1 Purpose
This document establishes standard operating procedures for the Credit Card Reward Intelligence Dashboard. It provides step-by-step guidance for system administration, operations, and support activities.

### 1.2 Scope
These procedures apply to:
- System administrators
- DevOps engineers
- Support personnel
- On-call engineers

### 1.3 Definitions

| Term | Definition |
|------|------------|
| Edge Function | Serverless backend function deployed on Deno |
| RLS | Row Level Security - database access control |
| PII | Personally Identifiable Information |
| RAG | Retrieval-Augmented Generation |
| TTL | Time to Live |

---

## 2. System Operations

### 2.1 Daily Operations Checklist

#### SOP-OPS-001: Daily Health Check

**Frequency:** Daily, 9:00 AM local time  
**Responsibility:** On-call Engineer  
**Duration:** 15 minutes

**Procedure:**

| Step | Action | Expected Result | If Failed |
|------|--------|-----------------|-----------|
| 1 | Navigate to preview URL | Dashboard loads | Escalate to P1 |
| 2 | Check login functionality | Can authenticate | Check auth service |
| 3 | Review error logs from last 24h | No critical errors | Investigate errors |
| 4 | Check database connectivity | Queries execute | Check DB status |
| 5 | Test chat functionality | Responses stream | Check AI gateway |
| 6 | Verify edge function health | Functions respond | Redeploy if needed |

**Documentation:** Log results in operations journal.

---

#### SOP-OPS-002: Weekly Maintenance Window

**Frequency:** Weekly, Sunday 2:00-4:00 AM local time  
**Responsibility:** DevOps Team  
**Duration:** 2 hours

**Procedure:**

| Step | Action | Notes |
|------|--------|-------|
| 1 | Announce maintenance window | 24h advance notice |
| 2 | Create database backup | See SOP-BACKUP-001 |
| 3 | Review and apply pending migrations | If applicable |
| 4 | Clear expired cache entries | Query cache > 7 days |
| 5 | Review token usage metrics | Optimize if needed |
| 6 | Update documentation | If changes made |
| 7 | Run smoke tests | See test cases |
| 8 | Announce completion | All channels |

---

### 2.2 System Access Procedures

#### SOP-OPS-003: Accessing Lovable Cloud Backend

**Purpose:** Access database, storage, and functions management  
**Authorization Required:** Admin role

**Procedure:**

| Step | Action | Screenshot Reference |
|------|--------|---------------------|
| 1 | Navigate to Lovable project | Project dashboard |
| 2 | Click "Cloud" tab | Cloud panel opens |
| 3 | Select "Database" for data access | Tables visible |
| 4 | Select "Functions" for edge functions | Function list |
| 5 | Select "Storage" for file access | Buckets visible |

**Security Note:** All access is logged. Use minimal necessary permissions.

---

#### SOP-OPS-004: Viewing Application Logs

**Purpose:** Debug issues and monitor system health  
**Authorization Required:** Developer role or higher

**Procedure:**

```
1. Access Edge Function Logs:
   - Navigate to Cloud > Functions
   - Select function (e.g., rag-chat)
   - View recent logs
   - Filter by error level if needed

2. Access Database Logs:
   - Navigate to Cloud > Database
   - Check query logs for slow queries
   - Review error logs for failures

3. Access Auth Logs:
   - Navigate to Cloud > Users
   - View authentication events
   - Check for failed login attempts
```

---

### 2.3 Performance Monitoring

#### SOP-OPS-005: Monitoring Response Times

**Frequency:** Continuous with daily review  
**Threshold Alerts:**

| Metric | Warning | Critical |
|--------|---------|----------|
| API Response P95 | > 500ms | > 1000ms |
| Chat First Token | > 1s | > 3s |
| PDF Parse Time | > 30s | > 60s |
| Database Query | > 100ms | > 500ms |

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Check token_usage table for latency trends |
| 2 | Review ai_evaluations for response times |
| 3 | Check cache hit rates in query_cache |
| 4 | If thresholds exceeded, investigate root cause |
| 5 | Document findings and actions taken |

---

## 3. User Management

### 3.1 User Account Procedures

#### SOP-USER-001: Viewing User Accounts

**Purpose:** Review registered users and their status  
**Authorization Required:** Admin role

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Navigate to Cloud > Users |
| 2 | View list of registered users |
| 3 | Check email verification status |
| 4 | Review last sign-in timestamps |

---

#### SOP-USER-002: Handling User Data Requests (GDPR)

**Purpose:** Process data export/deletion requests  
**Authorization Required:** Admin role + Legal approval  
**SLA:** 30 days from request

**Procedure:**

| Step | Action | Notes |
|------|--------|-------|
| 1 | Receive formal request | Via support channel |
| 2 | Verify user identity | Require email confirmation |
| 3 | Log request in compliance_logs | Document all actions |
| 4 | For **Export**: Query all user tables | profiles, cards, transactions, documents |
| 5 | For **Deletion**: Remove data from all tables | Cascade delete |
| 6 | Remove files from storage bucket | pdf-documents bucket |
| 7 | Confirm completion to user | Written confirmation |
| 8 | Update compliance log | Mark complete |

**Data Export Query:**
```sql
-- Export user data (replace USER_ID)
SELECT * FROM profiles WHERE user_id = 'USER_ID';
SELECT * FROM credit_cards WHERE user_id = 'USER_ID';
SELECT * FROM transactions WHERE user_id = 'USER_ID';
SELECT * FROM pdf_documents WHERE user_id = 'USER_ID';
SELECT * FROM document_chunks WHERE user_id = 'USER_ID';
```

---

### 3.2 Access Control

#### SOP-USER-003: Reviewing Access Logs

**Frequency:** Weekly  
**Purpose:** Detect unauthorized access attempts

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Query compliance_logs for last 7 days |
| 2 | Filter for pii_accessed = true |
| 3 | Review any unusual patterns |
| 4 | Check for failed login attempts |
| 5 | Report anomalies to security team |

---

## 4. Data Management

### 4.1 Database Operations

#### SOP-DATA-001: Database Query Execution

**Purpose:** Execute read queries for support/debugging  
**Authorization Required:** Developer role

**Procedure:**

| Step | Action | Notes |
|------|--------|-------|
| 1 | Identify required data | Document purpose |
| 2 | Write SELECT query only | No modifications |
| 3 | Test with LIMIT 10 first | Avoid large result sets |
| 4 | Execute in Cloud View | Use Run SQL |
| 5 | Document query and results | For audit trail |

**Important:** Never modify data without approval. Use migrations for schema changes.

---

#### SOP-DATA-002: Cache Management

**Purpose:** Clear or invalidate cached responses  
**When to Use:** Stale data issues, after major updates

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Identify affected cache entries |
| 2 | Option A: Clear specific entry |
| 3 | Option B: Clear all expired entries |
| 4 | Verify new queries generate fresh responses |

**Clear Expired Cache Query:**
```sql
DELETE FROM query_cache 
WHERE expires_at < NOW();
```

**Clear All Cache (Use with Caution):**
```sql
TRUNCATE TABLE query_cache;
```

---

### 4.2 Storage Management

#### SOP-DATA-003: Storage Bucket Maintenance

**Frequency:** Monthly  
**Purpose:** Clean orphaned files, review storage usage

**Procedure:**

| Step | Action |
|------|--------|
| 1 | List files in pdf-documents bucket |
| 2 | Compare with pdf_documents table |
| 3 | Identify orphaned files (in storage, not in DB) |
| 4 | Remove orphaned files if confirmed |
| 5 | Review total storage usage |
| 6 | Alert if approaching limits |

---

## 5. Security Operations

### 5.1 Security Monitoring

#### SOP-SEC-001: Security Log Review

**Frequency:** Daily  
**Purpose:** Detect and respond to security incidents

**Procedure:**

| Step | Action | Look For |
|------|--------|----------|
| 1 | Review auth logs | Failed login patterns |
| 2 | Check compliance_logs | Unusual data access |
| 3 | Review pii_masking_log | Masking failures |
| 4 | Check edge function logs | Injection attempts |
| 5 | Document and escalate | Any suspicious activity |

---

#### SOP-SEC-002: PII Audit

**Frequency:** Quarterly  
**Purpose:** Verify PII protection compliance

**Procedure:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Sample 10 random document_chunks | Get chunk texts |
| 2 | Search for credit card patterns | None found (masked) |
| 3 | Search for PAN patterns | None found (masked) |
| 4 | Search for email patterns | Partial masking verified |
| 5 | Review pii_masking_log counts | Consistent masking |
| 6 | Document audit results | Compliance report |

---

### 5.2 Secret Management

#### SOP-SEC-003: Secret Rotation

**Frequency:** Quarterly (or on suspected compromise)  
**Purpose:** Rotate sensitive credentials

**Secrets to Rotate:**

| Secret | Rotation Process |
|--------|-----------------|
| LOVABLE_API_KEY | Regenerate in Lovable settings |
| SUPABASE_SERVICE_ROLE_KEY | Contact Cloud support |

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Generate new secret value |
| 2 | Update in Cloud secrets management |
| 3 | Verify edge functions still work |
| 4 | Revoke old secret if possible |
| 5 | Document rotation in security log |

---

## 6. Incident Response

### 6.1 Incident Classification

| Severity | Definition | Response Time | Escalation |
|----------|------------|---------------|------------|
| P0 - Critical | System down, data breach | 15 minutes | Immediate |
| P1 - High | Major feature broken | 1 hour | Within 2 hours |
| P2 - Medium | Feature degraded | 4 hours | Next business day |
| P3 - Low | Minor issue | 24 hours | Weekly review |

### 6.2 Incident Response Procedures

#### SOP-INC-001: P0 Critical Incident Response

**Trigger:** System unavailable or data breach suspected

**Procedure:**

| Step | Action | Owner |
|------|--------|-------|
| 1 | Acknowledge incident | On-call |
| 2 | Create incident channel | On-call |
| 3 | Notify incident commander | On-call |
| 4 | Begin investigation | Team |
| 5 | Communicate to stakeholders | IC |
| 6 | Implement fix | Team |
| 7 | Verify resolution | QA |
| 8 | Post-incident review | Team |

**Communication Template:**
```
INCIDENT: [Brief description]
STATUS: [Investigating/Identified/Monitoring/Resolved]
IMPACT: [Who/what is affected]
NEXT UPDATE: [Time]
```

---

#### SOP-INC-002: Edge Function Failure

**Trigger:** Edge function returns 500 errors

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Check function logs for error details |
| 2 | Verify secrets are configured |
| 3 | Check external dependencies (AI gateway) |
| 4 | If code issue, deploy fix |
| 5 | If dependency issue, implement fallback |
| 6 | Monitor for resolution |

---

#### SOP-INC-003: Database Connection Issues

**Trigger:** Database queries failing

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Check Cloud database status |
| 2 | Verify connection limits not exceeded |
| 3 | Check for long-running queries |
| 4 | If needed, restart connection pool |
| 5 | Review recent migrations for issues |

---

## 7. Backup & Recovery

### 7.1 Backup Procedures

#### SOP-BACKUP-001: Database Backup

**Frequency:** Automatic daily + before major changes  
**Retention:** 30 days

**Manual Backup Procedure:**

| Step | Action |
|------|--------|
| 1 | Navigate to Cloud > Database |
| 2 | Access backup management |
| 3 | Create manual backup |
| 4 | Verify backup completed |
| 5 | Document backup ID and timestamp |

---

### 7.2 Recovery Procedures

#### SOP-BACKUP-002: Point-in-Time Recovery

**When to Use:** Data corruption, accidental deletion

**Procedure:**

| Step | Action | Notes |
|------|--------|-------|
| 1 | Identify target recovery point | Before incident |
| 2 | Create backup of current state | Safety net |
| 3 | Contact Cloud support | For PITR request |
| 4 | Verify recovered data | Test critical functions |
| 5 | Document recovery | Post-mortem |

---

## 8. Monitoring & Alerting

### 8.1 Metrics to Monitor

| Metric | Source | Threshold | Alert Channel |
|--------|--------|-----------|---------------|
| Error Rate | Edge function logs | > 1% | Slack |
| Response Time P95 | token_usage | > 500ms | Email |
| Cache Hit Rate | query_cache | < 50% | Dashboard |
| Failed Logins | auth_logs | > 10/hour | Security team |
| PII Masking Failures | pii_masking_log | Any | Security team |

### 8.2 Setting Up Alerts

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Define alert condition (metric + threshold) |
| 2 | Configure notification channel |
| 3 | Set appropriate severity |
| 4 | Test alert fires correctly |
| 5 | Document runbook for response |

---

## 9. Deployment Procedures

### 9.1 Frontend Deployment

#### SOP-DEPLOY-001: Frontend Code Deployment

**Trigger:** Code changes merged to main  
**Process:** Automatic on save in Lovable

**Procedure:**

| Step | Action |
|------|--------|
| 1 | Make code changes in Lovable editor |
| 2 | Preview changes in preview window |
| 3 | Test critical functionality |
| 4 | Click "Publish" when ready |
| 5 | Confirm publish dialog |
| 6 | Verify production deployment |
| 7 | Run smoke tests |

---

### 9.2 Backend Deployment

#### SOP-DEPLOY-002: Edge Function Deployment

**Trigger:** Edge function code changes  
**Process:** Automatic on save

**Procedure:**

| Step | Action | Notes |
|------|--------|-------|
| 1 | Modify edge function code | In supabase/functions/ |
| 2 | Functions auto-deploy | Immediate |
| 3 | Check function logs | Verify no errors |
| 4 | Test function endpoints | Using curl/API |
| 5 | Monitor for errors | First 15 minutes |

---

### 9.3 Database Migration

#### SOP-DEPLOY-003: Database Schema Migration

**Trigger:** Schema changes required  
**Process:** Migration tool with approval

**Procedure:**

| Step | Action | Notes |
|------|--------|-------|
| 1 | Write migration SQL | Complete, tested |
| 2 | Request migration via tool | Lovable migration tool |
| 3 | Review migration preview | Verify changes |
| 4 | Approve migration | Click approve |
| 5 | Verify migration applied | Check schema |
| 6 | Update types | Automatic regeneration |
| 7 | Update dependent code | If needed |

**Rollback Procedure:**
1. Write reverse migration SQL
2. Apply via migration tool
3. Verify rollback successful

---

## 10. Support Procedures

### 10.1 User Support

#### SOP-SUPPORT-001: User Issue Triage

**Purpose:** Categorize and route user issues

**Triage Matrix:**

| Issue Type | Category | Response |
|------------|----------|----------|
| Can't login | Auth | Check user status, reset if needed |
| Upload fails | Technical | Check file size, format |
| Wrong data | Data | Investigate parsing |
| Slow performance | Performance | Check metrics |
| Feature request | Product | Log for product team |

---

#### SOP-SUPPORT-002: Common Issue Resolution

**Issue: User can't log in**

| Step | Action |
|------|--------|
| 1 | Verify email exists in users |
| 2 | Check if email verified |
| 3 | Check for account lockout |
| 4 | If locked, unlock account |
| 5 | If password issue, trigger reset |

**Issue: PDF won't parse**

| Step | Action |
|------|--------|
| 1 | Check file size (< 10MB) |
| 2 | Verify PDF is not encrypted |
| 3 | Check parse-pdf logs for errors |
| 4 | Try different extraction method |
| 5 | If persistent, log for investigation |

---

### 10.2 Escalation Procedures

#### SOP-SUPPORT-003: Escalation Path

| Level | Owner | When to Escalate |
|-------|-------|------------------|
| L1 | Support Agent | Unable to resolve in 30 min |
| L2 | Senior Support | Requires technical investigation |
| L3 | Engineering | Bug or system issue identified |
| L4 | Incident Commander | P0/P1 incident declared |

---

## Appendix A: Quick Reference Commands

### Database Queries

```sql
-- Check user data
SELECT * FROM profiles WHERE user_id = 'UUID' LIMIT 10;

-- Check recent errors
SELECT * FROM compliance_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check cache performance
SELECT 
  COUNT(*) as total_queries,
  SUM(CASE WHEN cache_hit THEN 1 ELSE 0 END) as cache_hits
FROM token_usage
WHERE created_at > NOW() - INTERVAL '7 days';

-- Check token usage
SELECT 
  DATE(created_at) as date,
  SUM(tokens_input + tokens_output) as total_tokens,
  SUM(estimated_cost) as total_cost
FROM token_usage
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Appendix B: Contact Information

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| On-Call Engineer | Via paging system | 15 minutes |
| Engineering Lead | Direct message | 1 hour |
| Security Team | security@ channel | 30 minutes |
| Product Owner | Direct message | Business hours |

---

## Appendix C: Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-31 | Operations Team | Initial release |

**Next Review Date:** April 30, 2026

---

*End of Standard Operating Procedures*
