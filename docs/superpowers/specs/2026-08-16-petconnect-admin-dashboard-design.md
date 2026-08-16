# PetConnect Admin Dashboard

## Purpose

Replace the single, long PetConnect section in the admin application with an operational dashboard and separate workspaces for members, registered pets, missing-pet alerts, and organizations.

## Navigation

The existing Admin sidebar will contain an expandable PetConnect group with five sub-navigation entries:

- Overview
- Members
- Pets
- Alerts
- Organizations

Each entry activates its own admin section while retaining the application's current single-page admin architecture and authentication behavior.

## Overview Dashboard

The overview displays four summary cards:

- Registered Members: total and verified member counts.
- Registered Pets: total and currently missing pet counts.
- Missing-Pet Alerts: total and active alert counts.
- Organizations: total and active organization counts.

Each card links directly to its corresponding PetConnect workspace.

## Dedicated Workspaces

### Members

Display existing member details and management actions. Server-side search matches first name, last name, and email. Filters cover verification status, country, and whether email alerts are enabled.

### Pets

Display the pet, microchip, owner, and missing status. Server-side search matches pet name, microchip, owner name, and owner email. Filters cover species and missing status.

### Alerts

Display pet, reporter, type, location, and status. Server-side search matches pet name, reporter email, city, and state. Filters cover lost/found type, active/found/closed status, and country. Existing status updates and deletion remain available.

### Organizations

Display organization, type, location, verification, and active status. Server-side search matches organization name, contact name, email, city, and state. Filters cover organization type, active status, verification status, and country. Existing add, active toggle, and deletion actions remain available.

## Data Flow

The overview receives a protected summary endpoint returning totals only. Each workspace requests its own protected endpoint with search and filter query parameters. The admin client refreshes only the active workspace after an edit or deletion.

## Complete Address Capture

PetConnect member and organization location forms will collect a complete geographic address: street address, city, state or province, postal code, and country. This applies to public member registration, public organization registration, and the corresponding Admin create and edit forms.

Member records will gain a street-address field. The address is geocoded when a member is registered or when an administrator changes location details, storing updated latitude and longitude for alert-radius matching. Organization forms will expose their already-supported street address and postal code fields in the Admin interface and likewise refresh coordinates after location changes.

Pet records and finder contact forms do not collect an address because they do not establish a searchable member or partner location.

## Error Handling and Testing

Empty filter results show an explicit empty state. API failures show the existing admin toast error. Tests verify the dashboard navigation, summary API, server-side filter parameters, separate render targets, and retained management controls.
