# Multi-Campus SaaS Platform Conversion Plan

Convert the existing single-campus management application into a secure, scalable, subscription-based Multi-Tenant Campus Management SaaS Platform while preserving all existing functionality, CCE assessments, and academic workflows.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> - **Multi-Tenant Architecture**: Establishes a 3-tier access model (Super Admin, Campus Admin, and Campus Staff/Students) with strict tenant isolation (`campus_id` validation on every query, write, and storage path).
> - **Independent Academic Configuration**: Each campus independently configures its own academic year, classes, sections, subjects, assessment categories, and CCE rules without cross-campus interference.
> - **Subscription & Billing**: Plan tiers (Basic vs Premium), billing management, and grace periods for campus subscriptions.

---

## 1. Overview & Core Concept

- **What It Does**: Transforms the platform into a multi-tenant SaaS where multiple educational institutions can register, subscribe, and manage their campuses independently under one roof.
- **Target Audience / Persona**: Platform Owner (Super Admin), Campus Administrators, Teachers, and Students.
- **Key Value**: Full multi-tenant isolation, independent academic configurations per campus, subscription lifecycle management, and robust security.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. Public Landing Page & Campus Registration (select subscription plan, setup campus details).
  2. Super Admin Portal (manage all registered campuses, subscriptions, platform settings, announcements, and audit logs).
  3. Campus Admin Portal (manage campus settings, academic config, student/staff roster, CCE, and subscription billing).
  4. Campus Staff & Student Portals (campus-isolated teaching, learning, assessments, and report cards).
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Professional, trustworthy, utilitarian EdTech SaaS dashboard.
  - *Color Palette & Mood*: Dominant clean neutral canvas (`bg-slate-50`), structured surfaces (`bg-white`, `border-slate-200`), primary actions in slate-900 with amber/blue accents.
  - *Typography*: Plus Jakarta Sans display & body, JetBrains Mono for tabular data.
- **Interactive Feedback & Motion**: Smooth tab switching, real-time feedback on tenant isolation checks, loading skeletons, and success/error toasts.

---

## 3. Key Product Decisions & Trade-Offs

- **Tenant Isolation Strategy**:
  - *Chosen Approach*: Client-side context mapping + Firestore collection paths / `campus_id` filtering + strict client/server authorization helpers.
  - *Why*: Ensures high performance and complete data privacy between campuses.
- **Independent Academic Rules**:
  - *Chosen Approach*: Store academic settings and configuration inside each campus document and tenant collection, avoiding hardcoded global rules.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                 Public SaaS Landing Page                    │
│            (Campus Registration & Plan Selection)           │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────────┐┌─────────────────────────────┐
│      Super Admin Portal      ││     Campus Admin Portal     │
│  (Campuses, Billing, Plans)  ││ (Academic Config, Roster)   │
└──────────────┬───────────────┘└──────────────┬──────────────┘
               │                              │
               └──────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Multi-Tenant Firestore DB                  │
│    Collections: campuses, subscriptions, users, students,   │
│    staff, subjects, assessments, cceMarks, audit_logs       │
│    (Filtered strictly by verified campus_id / tenant context) │
└─────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `campuses`: id, name, slug, status ('active' | 'suspended' | 'trial'), subscriptionPlanId, createdAt, settings.
  - `subscriptions`: id, campusId, planId, status ('active' | 'past_due' | 'canceled'), renewalDate.
  - `users` (Staff & Students): id, campusId, role ('super_admin' | 'campus_admin' | 'teacher' | 'student'), name, email, admissionNumber, classGrade, section.
  - `tenant-owned entities`: all records linked with verified `campusId`.
- **Security & Authorization**:
  - Enforce `campusId` match on all read/write operations.
  - Super Admin has platform-wide management rights without uninvited access to private student academic records.
