# SubTracker - Subscription & SaaS Expense Manager

## Overview
**SubTracker** is a web-based management platform designed to help users keep track of their recurring subscriptions (such as Netflix, Spotify, AWS, ChatGPT) and SaaS bills. It provides a visual dashboard to monitor monthly/yearly spending, automatically calculates upcoming renewal dates, and helps prevent unwanted auto-renewal charges.

This project is developed as a final assignment for the **System Performance Evaluation** course, focusing on complex business logic (date/time cycles, currency calculation) and state management for cross-testing purposes.

## Key Features
- **Subscription Logging:** Add new subscriptions with billing cycles (Weekly, Monthly, Annually).
- **Automated Billing Calculation:** Automatically computes the next payment date based on the chosen billing cycle.
- **Multi-Currency Support:** Handles different currencies and standardizes total expense tracking.
- **Visual Dashboard:** Interactive charts displaying monthly spending breakdowns.
- **Status Management:** Active, Expired, or Cancelled subscription states.

## Testing & QA Focus
*(This section is for the cross-testing partner)*
This system contains complex business logic that requires strict validation. Testers are encouraged to focus on:
1. **Date & Time Logic:** End-of-month bugs, leap years, and invalid date inputs.
2. **Currency & Math Operations:** Floating-point rounding errors and negative values.
3. **State Transitions:** Updating subscription statuses and filtering active/inactive plans.

## Tech Stack
- **Frontend:** HTML, CSS, JavaScript (Tailwind CSS / DaisyUI for UI)
- **Backend:**
- **Database:** 
