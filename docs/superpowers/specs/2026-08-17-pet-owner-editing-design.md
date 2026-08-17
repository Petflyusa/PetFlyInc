# PetConnect Pet Owner Editing

## Purpose

Let a signed-in PetConnect owner keep every stored pet detail current and make the PetConnect home page provide a direct owner sign-in path.

## Owner Experience

- Each pet card on `/dashboard` includes an Edit action.
- The action opens `/dashboard/pets/:id/edit` with the owner's current pet data prefilled.
- The form can update pet name, microchip number, species, breed, color, gender, birth date, notes, and the primary photo.
- The current photo is shown when one exists. The owner can replace it or remove it.
- Saving returns the owner to the dashboard. Validation errors return to the editor without changing the existing record.
- The missing-pet state remains managed through the missing-alert workflow.

## Server Behavior

- The edit route and update action require a PetConnect member session.
- Every read and write scopes the pet by both pet ID and the signed-in member ID.
- The update uses the same species, gender, microchip, and image validation as registration.
- A replacement image is saved before the database update. The former stored image is deleted only after a successful update.
- Selecting photo removal clears the stored photo after a successful update.

## Home Page Entry

- The PetConnect hero on `/registry` keeps Create an account and adds Pet owner sign in linking to `/login`.

## Verification

- Automated tests cover the edit route, owner-scoped update, photo replacement/removal, and the hero sign-in link.
- Full test suite and server syntax checks run before publication.
