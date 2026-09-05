# P-01: Backend Foundation

**Owner:** Dhanesh  
**Goal:** Set up RBAC and auto-routing.

## Tasks
1. **User Extensions:** Modify `app/models/user.py` to add `role` (String, default "employee") and `is_active` (Boolean, default True).
2. **Migration:** Run `alembic revision --autogenerate -m "add_role_is_active_to_users"` and `alembic upgrade head`.
3. **Auto-router:** Create `app/api/__init__.py` that dynamically imports all `routes.py` from subdirectories and mounts their `router` on `api_router`. Update `main.py` to use this single `api_router`.
4. **RBAC:** Create `app/core/rbac.py` with a `require_roles(*roles)` dependency using `get_current_user`.
5. **Admin Bootstrapping:** In `UserService.register`, assign the "admin" role to the very first user created.

**Build Prompt for AI:**
> Implement P-01. Add role and is_active to User model, generate Alembic migration. Implement auto-include routing in app/api/__init__.py and update main.py. Implement RBAC dependency in app/core/rbac.py. Make first registered user an admin.
