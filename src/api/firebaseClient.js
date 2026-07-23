import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  query,
  limit as limitFn,
} from 'firebase/firestore';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

// IMPORTANT:
// Replace these values with your Firebase Web App config from:
// Firebase Console -> Project Settings -> General -> Your apps -> Web app config
// You may also use .env values. See .env.example.
const firebaseConfig = {
  apiKey: 'AIzaSyC4lqn04LroR1WpDLWK7KH5CSeUnZ74w0U',
  authDomain: 'pro-estate-system-2026.firebaseapp.com',
  projectId: 'pro-estate-system-2026',
  storageBucket: 'pro-estate-system-2026.firebasestorage.app',
  messagingSenderId: '780888974873',
  appId: '1:780888974873:web:e3586a40d69c763871ac88',
  measurementId: 'G-1H3DSXVW72',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
auth.languageCode = 'ar';
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

const toArray = (value) => Array.isArray(value) ? value : [];

const normalizeData = (data = {}) => {
  const cleaned = { ...data };
  Object.keys(cleaned).forEach((key) => {
    if (cleaned[key] === undefined) cleaned[key] = null;
  });
  return cleaned;
};

const parseOrder = (orderBy) => {
  if (!orderBy || typeof orderBy !== 'string') return { field: 'created_date', direction: 'desc' };
  if (orderBy.startsWith('-')) return { field: orderBy.slice(1), direction: 'desc' };
  return { field: orderBy, direction: 'asc' };
};

const sortItems = (items, orderBy) => {
  const { field, direction } = parseOrder(orderBy);
  const factor = direction === 'desc' ? -1 : 1;
  return [...toArray(items)].sort((a, b) => {
    const av = a?.[field] ?? '';
    const bv = b?.[field] ?? '';
    if (av > bv) return 1 * factor;
    if (av < bv) return -1 * factor;
    return 0;
  });
};

const matchesFilter = (item, filterObject = {}) => {
  return Object.entries(filterObject || {}).every(([key, value]) => {
    if (Array.isArray(value)) return value.includes(item?.[key]);
    return item?.[key] === value;
  });
};

const getCollection = (entityName) => collection(db, entityName);

const createEntityApi = (entityName) => ({
  async list(orderBy = '-created_date', limitCount) {
    const constraints = [];
    if (typeof limitCount === 'number') constraints.push(limitFn(limitCount));
    const snap = await getDocs(query(getCollection(entityName), ...constraints));
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return sortItems(items, orderBy);
  },

  async filter(filterObject = {}, orderBy = '-created_date', limitCount) {
    const allItems = await this.list(orderBy);
    const filtered = allItems.filter((item) => matchesFilter(item, filterObject));
    return typeof limitCount === 'number' ? filtered.slice(0, limitCount) : filtered;
  },

  async get(id) {
    if (!id) return null;
    const snap = await getDoc(doc(db, entityName, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  },

  async create(data) {
    const now = new Date().toISOString();
    const payload = normalizeData({
      ...data,
      created_date: data?.created_date || now,
      updated_date: data?.updated_date || now,
    });
    const docRef = await addDoc(getCollection(entityName), payload);
    return { id: docRef.id, ...payload };
  },

  async update(id, data) {
    if (!id) throw new Error(`${entityName}.update requires an id`);
    const payload = normalizeData({ ...data, updated_date: new Date().toISOString() });
    await updateDoc(doc(db, entityName, id), payload);
    return { id, ...payload };
  },

  async delete(id) {
    if (!id) throw new Error(`${entityName}.delete requires an id`);
    await deleteDoc(doc(db, entityName, id));
    return { id };
  },

  subscribe(callback, errorCallback) {
    if (typeof callback !== 'function') return () => {};
    return onSnapshot(
      getCollection(entityName),
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(sortItems(items, '-created_date'));
      },
      (error) => {
        if (typeof errorCallback === 'function') {
          errorCallback(error);
        } else {
          console.warn(`Failed to subscribe to ${entityName}`, error);
        }
      },
    );
  },
});

const entityNames = [
  'AdvertisementBanner',
  'AppSettings',
  'AppUser',
  'BarcodeSettings',
  'BarcodeStatus',
  'Branch',
  'Commission',
  'Contract',
  'ContractClause',
  'Currency',
  'Department',
  'Employee',
  'EmployeeBadge',
  'EmployeeFeedback',
  'EmployeeGoal',
  'EmployeeGroup',
  'EmployeePermission',
  'EmployeeReport',
  'EmployeeTask',
  'Invite',
  'Invoice',
  'Lead',
  'LossReason',
  'Maintenance',
  'MessageTemplate',
  'Notification',
  'PermissionApprover',
  'Project',
  'ProjectCategory',
  'Property',
  'PropertyLabel',
  'PropertyPurpose',
  'PropertyStatusColor',
  'Sale',
  'SaleContract',
  'SaleContractClause',
  'SaleInvoice',
  'SaleOwnerSpent',
  'TaskColor',
  'Tenant',
  'Translation',
  'User',
  'UserPermission',
];

const entities = Object.fromEntries(entityNames.map((name) => [name, createEntityApi(name)]));

const waitForAuthReady = () => new Promise((resolve) => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    unsubscribe();
    resolve(user);
  });
});


const OWNER_EMAILS = ['myspellcard@gmail.com', 'myspellcard@yahoo.com'];

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

const isOwnerEmail = (email) => OWNER_EMAILS.includes(normalizeEmail(email));

const isLocalPreviewMode = () => {
  if (typeof window === 'undefined') return false;
  return ['127.0.0.1', 'localhost'].includes(window.location.hostname)
    && window.localStorage?.getItem('darRentNestLocalPreview') === 'true';
};

const getLocalPreviewInvites = () => {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem('darRentNestLocalInvites') || '[]');
  } catch {
    return [];
  }
};

const saveLocalPreviewInvites = (items) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('darRentNestLocalInvites', JSON.stringify(items));
};

const ensureInviteForEmail = async (email, defaults = {}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const existing = await entities.Invite.filter({ email: normalizedEmail });
  if (existing?.[0]) return existing[0];

  return entities.Invite.create({
    email: normalizedEmail,
    role: defaults.role || 'user',
    status: defaults.status || 'pending',
    invited: true,
    ...defaults,
  });
};

const getInviteForEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;
  const matches = await entities.Invite.filter({ email: normalizedEmail });
  return matches?.[0] || null;
};

const ensureUserRecords = async (firebaseUser, data = {}) => {
  const email = normalizeEmail(firebaseUser?.email || data.email);
  if (!firebaseUser?.uid || !email) return null;

  const owner = isOwnerEmail(email);
  const role = owner ? 'owner' : (data.role || 'user');
  const status = owner ? 'approved' : (data.status || 'pending');
  const isActive = owner ? true : data.is_active === true;

  let appUser = (await entities.AppUser.filter({ uid: firebaseUser.uid }))?.[0] || null;
  if (!appUser) {
    const emailMatches = await entities.AppUser.filter({ email });
    appUser = emailMatches?.[0] || null;
  }

  const payload = {
    uid: firebaseUser.uid,
    email,
    full_name: data.full_name || firebaseUser.displayName || email,
    name: data.full_name || firebaseUser.displayName || email,
    username: data.username || email.split('@')[0],
    role,
    status,
    is_active: isActive,
    approved: status === 'approved',
    is_owner: owner ? true : data.is_owner === true,
    is_admin: owner ? true : data.is_admin === true,
    permissions: owner
      ? Array.from(new Set([...(Array.isArray(data.permissions) ? data.permissions : []), 'admin', '*']))
      : (Array.isArray(data.permissions) ? data.permissions : []),
    provider: data.provider || (firebaseUser.providerData?.[0]?.providerId || 'password'),
    avatar_color: data.avatar_color || '#6366f1',
    photo_url: data.photo_url || firebaseUser.photoURL || '',
  };

  if (appUser?.id) {
    await entities.AppUser.update(appUser.id, payload);
  } else {
    appUser = await entities.AppUser.create(payload);
  }

  const platformUser = (await entities.User.filter({ uid: firebaseUser.uid }))?.[0]
    || (await entities.User.filter({ email }))?.[0]
    || null;

  if (platformUser?.id) {
    await entities.User.update(platformUser.id, payload);
  } else {
    await entities.User.create(payload);
  }

  return { ...appUser, ...payload };
};

const assertInvitedOrOwner = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (isOwnerEmail(normalizedEmail)) return { role: 'owner', status: 'approved', is_active: true };

  const invite = await getInviteForEmail(normalizedEmail);
  if (!invite) {
    throw new Error('هذا البريد غير مدعو. يرجى طلب دعوة من المالك أو المدير.');
  }
  if (invite.status === 'blocked') {
    throw new Error('هذا البريد محظور ولا يمكنه الدخول للنظام.');
  }
  return invite;
};

const assertApprovedProfile = async (profile) => {
  if (!profile) throw new Error('Authentication required');
  if (isOwnerEmail(profile.email)) return true;

  const status = profile.status || (profile.is_active === false ? 'blocked' : 'pending');
  if (status !== 'approved' || profile.is_active === false) {
    throw new Error('حسابك بانتظار موافقة المالك أو المدير.');
  }
  return true;
};

const finalizeGoogleUser = async (firebaseUser) => {
  const email = normalizeEmail(firebaseUser.email);
  const invite = await assertInvitedOrOwner(email);
  const owner = isOwnerEmail(email);
  const existingProfile = await getUserProfile(firebaseUser);
  const invitedStatus = invite.status === 'approved' || invite.login_allowed === true ? 'approved' : 'pending';
  const invitedIsActive = invite.status === 'approved' || invite.login_allowed === true || invite.is_active === true;

  if (!existingProfile || existingProfile.status === 'pending' || existingProfile.is_active !== true) {
    await ensureUserRecords(firebaseUser, {
      role: owner ? 'owner' : (invite.role || 'user'),
      status: owner ? 'approved' : invitedStatus,
      is_active: owner ? true : invitedIsActive,
      provider: 'google',
      photo_url: firebaseUser.photoURL || '',
    });
  }

  const profile = await getUserProfile(firebaseUser);
  await assertApprovedProfile(profile);
  return profile;
};


const getUserProfile = async (firebaseUser) => {
  if (!firebaseUser) return null;

  let profile = null;
  const email = normalizeEmail(firebaseUser.email);

  try {
    const matches = await entities.AppUser.filter({ uid: firebaseUser.uid });
    profile = matches?.[0] || null;

    if (!profile && email) {
      const emailMatches = await entities.AppUser.filter({ email });
      profile = emailMatches?.[0] || null;
      if (profile?.id && !profile.uid) {
        await entities.AppUser.update(profile.id, { uid: firebaseUser.uid });
        profile = { ...profile, uid: firebaseUser.uid };
      }
    }

    if (!profile && isOwnerEmail(email)) {
      profile = await ensureUserRecords(firebaseUser, {
        role: 'owner',
        status: 'approved',
        is_active: true,
        provider: firebaseUser.providerData?.[0]?.providerId || 'password',
      });
    }
  } catch (error) {
    console.warn('Could not read AppUser profile:', error);
  }

  const owner = isOwnerEmail(email);
  if (owner && profile?.id && (profile.role !== 'owner' || profile.status !== 'approved' || profile.is_active !== true)) {
    const ownerPayload = {
      role: 'owner',
      status: 'approved',
      is_active: true,
      approved: true,
      is_owner: true,
      is_admin: true,
      permissions: Array.from(new Set([...(Array.isArray(profile.permissions) ? profile.permissions : []), 'admin', '*'])),
    };

    try {
      await entities.AppUser.update(profile.id, ownerPayload);
      const platformUser = (await entities.User.filter({ uid: firebaseUser.uid }))?.[0]
        || (await entities.User.filter({ email }))?.[0]
        || null;
      if (platformUser?.id) await entities.User.update(platformUser.id, ownerPayload);
      profile = { ...profile, ...ownerPayload };
    } catch (error) {
      console.warn('Could not promote owner profile:', error);
    }
  }

  return {
    ...profile,
    id: profile?.id || firebaseUser.uid,
    uid: firebaseUser.uid,
    email: email || profile?.email || '',
    full_name: profile?.full_name || firebaseUser.displayName || firebaseUser.email || 'User',
    name: profile?.full_name || firebaseUser.displayName || firebaseUser.email || 'User',
    username: profile?.username || '',
    avatar_color: profile?.avatar_color || '#6366f1',
    role: owner ? 'owner' : (profile?.role || 'user'),
    status: owner ? 'approved' : (profile?.status || 'pending'),
    is_active: owner ? true : profile?.is_active === true,
    approved: owner ? true : profile?.status === 'approved',
    is_owner: owner ? true : profile?.is_owner === true,
    is_admin: owner ? true : (profile?.is_admin === true || profile?.role === 'admin'),
    permissions: owner
      ? Array.from(new Set([...(Array.isArray(profile?.permissions) ? profile.permissions : []), 'admin']))
      : (Array.isArray(profile?.permissions) ? profile.permissions : []),
  };
};

const authApi = {
  async completeGoogleRedirect() {
    const cred = await getRedirectResult(auth);
    if (!cred?.user) return null;

    try {
      return await finalizeGoogleUser(cred.user);
    } catch (error) {
      await signOut(auth).catch(() => {});
      throw error;
    }
  },

  async me() {
    const user = auth.currentUser || await waitForAuthReady();
    if (!user) throw new Error('Authentication required');
    const profile = await getUserProfile(user);
    await assertApprovedProfile(profile);
    return profile;
  },

  async login({ email, password }) {
    await assertInvitedOrOwner(email);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const profile = await getUserProfile(cred.user);
    await assertApprovedProfile(profile);
    return profile;
  },

  async loginWithGoogle() {
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      if (host === '127.0.0.1' || host === 'localhost') {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }

      const cred = await signInWithPopup(auth, googleProvider);
      return await finalizeGoogleUser(cred.user);
    } catch (error) {
      if (
        error?.code === 'auth/popup-blocked' ||
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/operation-not-supported-in-this-environment'
      ) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      await signOut(auth).catch(() => {});
      throw error;
    }
  },

  async loginWithGoogleRedirect() {
    await signInWithRedirect(auth, googleProvider);
    return null;
  },

  async register({ email, password, fullName }) {
    const invite = await assertInvitedOrOwner(email);
    const owner = isOwnerEmail(email);

    const cred = await createUserWithEmailAndPassword(auth, email, password);
    if (fullName) await updateProfile(cred.user, { displayName: fullName });

    await ensureUserRecords(cred.user, {
      full_name: fullName || email,
      role: owner ? 'owner' : (invite.role || 'user'),
      status: owner ? 'approved' : (invite.status === 'approved' || invite.login_allowed === true ? 'approved' : 'pending'),
      is_active: owner ? true : (invite.status === 'approved' || invite.login_allowed === true || invite.is_active === true),
      provider: 'password',
    });

    const profile = await getUserProfile(cred.user);
    await assertApprovedProfile(profile);
    return profile;
  },

  async updateMe(data) {
    const firebaseUser = auth.currentUser || await waitForAuthReady();
    if (!firebaseUser) throw new Error('Authentication required');

    const profile = await getUserProfile(firebaseUser);
    await assertApprovedProfile(profile);

    if (data?.full_name || data?.username) {
      await updateProfile(firebaseUser, { displayName: data.full_name || data.username || firebaseUser.displayName || '' }).catch(() => {});
    }

    if (profile?.id) {
      await entities.AppUser.update(profile.id, data);
      return { ...profile, ...data };
    }

    return ensureUserRecords(firebaseUser, data);
  },

  async logout() {
    await signOut(auth);
    return true;
  },

  redirectToLogin() {
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return null;
  },
};

const uploadFile = async ({ file, path = 'uploads' }) => {
  if (!file) throw new Error('UploadFile requires a file');
  const safeName = String(file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${path}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, filePath);
  await uploadBytes(fileRef, file);
  const file_url = await getDownloadURL(fileRef);
  return { file_url, url: file_url, path: filePath };
};

const functionsApi = {
  async invoke(name, payload = {}) {
    console.warn(`Firebase compatibility stub for function: ${name}`, payload);

    if (name === 'updateTenantPhoneInContracts') {
      const { tenantId, newPhone } = payload;
      const contracts = await entities.Contract.filter({ tenant_id: tenantId });
      await Promise.all(contracts.map((c) => entities.Contract.update(c.id, { tenant_phone: newPhone })));
      return { success: true, updated: contracts.length };
    }

    if (name === 'getTaskByToken') {
      const token = payload?.token;
      const tasks = await entities.EmployeeTask.list('-created_date');
      const task = tasks.find((t) => t.public_token === token || t.share_token === token || t.token === token);
      return task || null;
    }

    if (name === 'updateTaskComments') {
      const { task_id, comments } = payload;
      if (!task_id) return { success: false };
      await entities.EmployeeTask.update(task_id, { comments });
      return { success: true };
    }

    if (name === 'getSourceFiles') {
      return { files: [], message: 'Source-file scanning is not available in the browser build.' };
    }

    if (name === 'sendWhatsAppNotification') {
      return { success: false, message: 'WhatsApp sending requires a Firebase Cloud Function and WhatsApp API credentials.' };
    }

    return { success: false, message: `Function ${name} is not implemented in Firebase client.` };
  },
};

const usersApi = {
  async inviteUser(email, role = 'user') {
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) throw new Error('Email is required');

    const now = new Date().toISOString();
    const effectiveRole = isOwnerEmail(normalizedEmail) ? 'owner' : role;
    const invitePayload = {
      email: normalizedEmail,
      role: effectiveRole,
      status: 'approved',
      is_active: true,
      login_allowed: true,
      approved: true,
      verified: true,
      invited: true,
      invited_at: now,
    };
    const userPayload = {
      email: normalizedEmail,
      full_name: normalizedEmail,
      username: normalizedEmail.split('@')[0],
      role: effectiveRole,
      status: 'approved',
      is_active: true,
      login_allowed: true,
      invited: true,
      invited_at: now,
      approved: true,
      verified: true,
      is_owner: effectiveRole === 'owner',
      is_admin: effectiveRole === 'owner' || effectiveRole === 'admin',
      permissions: effectiveRole === 'owner' ? ['admin', '*'] : [],
    };

    try {
      let invite = (await entities.Invite.filter({ email: normalizedEmail }))?.[0];
      if (invite?.id) {
        await entities.Invite.update(invite.id, invitePayload);
        invite = { ...invite, ...invitePayload };
      } else {
        invite = await entities.Invite.create(invitePayload);
      }

      const existingAppUser = (await entities.AppUser.filter({ email: normalizedEmail }))?.[0];
      const appUserPayload = {
        ...userPayload,
        full_name: existingAppUser?.full_name || userPayload.full_name,
        username: existingAppUser?.username || userPayload.username,
      };
      const appUser = existingAppUser?.id
        ? await entities.AppUser.update(existingAppUser.id, appUserPayload)
        : await entities.AppUser.create(appUserPayload);

      const existingUser = (await entities.User.filter({ email: normalizedEmail }))?.[0];
      if (existingUser?.id) {
        await entities.User.update(existingUser.id, appUserPayload);
      } else {
        await entities.User.create(appUserPayload);
      }

      return { invite, user: appUser, localOnly: false };
    } catch (error) {
      if (!isLocalPreviewMode()) throw error;

      const localInvite = {
        id: `local-invite-${Date.now()}`,
        ...invitePayload,
        ...userPayload,
        localOnly: true,
      };
      const existing = JSON.parse(window.localStorage.getItem('darRentNestLocalInvites') || '[]');
      const withoutDuplicate = existing.filter((item) => normalizeEmail(item.email) !== normalizedEmail);
      window.localStorage.setItem('darRentNestLocalInvites', JSON.stringify([localInvite, ...withoutDuplicate]));
      return { invite: localInvite, user: localInvite, localOnly: true };
    }
  },

  async approveUser(userId) {
    if (isLocalPreviewMode() && String(userId || '').startsWith('local-invite-')) {
      const now = new Date().toISOString();
      const updated = getLocalPreviewInvites().map((item) => (
        item.id === userId
          ? { ...item, status: 'approved', is_active: true, approved: true, verified: true, login_allowed: true, approved_at: now, verified_at: now }
          : item
      ));
      saveLocalPreviewInvites(updated);
      return updated.find((item) => item.id === userId) || null;
    }

    const user = await entities.User.get(userId);
    if (!user) throw new Error('User not found');

    const payload = { status: 'approved', is_active: true, approved: true, verified: true, login_allowed: true, approved_at: new Date().toISOString(), verified_at: new Date().toISOString() };
    await entities.User.update(userId, payload);

    const appUser = user.uid
      ? (await entities.AppUser.filter({ uid: user.uid }))?.[0]
      : (await entities.AppUser.filter({ email: normalizeEmail(user.email) }))?.[0];

    if (appUser?.id) await entities.AppUser.update(appUser.id, payload);

    const invite = (await entities.Invite.filter({ email: normalizeEmail(user.email) }))?.[0];
    if (invite?.id) await entities.Invite.update(invite.id, payload);
    else await entities.Invite.create({ email: normalizeEmail(user.email), role: user.role || 'user', invited: true, ...payload });

    return { ...user, ...payload };
  },

  async blockUser(userId) {
    if (isLocalPreviewMode() && String(userId || '').startsWith('local-invite-')) {
      const now = new Date().toISOString();
      const updated = getLocalPreviewInvites().map((item) => (
        item.id === userId
          ? { ...item, status: 'blocked', is_active: false, approved: false, login_allowed: false, blocked_at: now }
          : item
      ));
      saveLocalPreviewInvites(updated);
      return updated.find((item) => item.id === userId) || null;
    }

    const user = await entities.User.get(userId);
    if (!user) throw new Error('User not found');

    const payload = { status: 'blocked', is_active: false, approved: false, login_allowed: false, blocked_at: new Date().toISOString() };
    await entities.User.update(userId, payload);

    const appUser = user.uid
      ? (await entities.AppUser.filter({ uid: user.uid }))?.[0]
      : (await entities.AppUser.filter({ email: normalizeEmail(user.email) }))?.[0];

    if (appUser?.id) await entities.AppUser.update(appUser.id, payload);

    const invite = (await entities.Invite.filter({ email: normalizeEmail(user.email) }))?.[0];
    if (invite?.id) await entities.Invite.update(invite.id, payload);

    return { ...user, ...payload };
  },

  async deleteUserAccess(userId) {
    if (isLocalPreviewMode() && String(userId || '').startsWith('local-invite-')) {
      saveLocalPreviewInvites(getLocalPreviewInvites().filter((item) => item.id !== userId));
      return { id: userId, localOnly: true };
    }

    const user = await entities.User.get(userId);
    if (!user) throw new Error('User not found');
    if (isOwnerEmail(user.email) || user.role === 'owner' || user.is_owner === true) {
      throw new Error('لا يمكن حذف حساب المالك.');
    }

    const email = normalizeEmail(user.email);
    const appUsersByUid = user.uid ? await entities.AppUser.filter({ uid: user.uid }) : [];
    const appUsersByEmail = await entities.AppUser.filter({ email });
    const appUsers = [...appUsersByUid, ...appUsersByEmail]
      .filter((item, index, arr) => item?.id && arr.findIndex((match) => match.id === item.id) === index);
    const invites = await entities.Invite.filter({ email });
    const userPerms = await entities.UserPermission.filter({ user_id: userId });
    const emailPerms = await entities.UserPermission.filter({ user_email: email });
    const permissionsToDelete = [...userPerms, ...emailPerms]
      .filter((item, index, arr) => item?.id && arr.findIndex((match) => match.id === item.id) === index);

    await Promise.all([
      ...permissionsToDelete.map((item) => entities.UserPermission.delete(item.id)),
      ...appUsers.filter((item) => item?.id).map((item) => entities.AppUser.delete(item.id)),
      ...invites.filter((item) => item?.id).map((item) => entities.Invite.delete(item.id)),
    ]);
    await entities.User.delete(userId);

    return { id: userId, email };
  },

  async makeOwner(email) {
    const normalizedEmail = normalizeEmail(email);
    const payload = { email: normalizedEmail, role: 'owner', status: 'approved', is_active: true, approved: true };
    const appUser = (await entities.AppUser.filter({ email: normalizedEmail }))?.[0];
    if (appUser?.id) await entities.AppUser.update(appUser.id, payload);
    else await entities.AppUser.create({ ...payload, full_name: normalizedEmail, username: normalizedEmail.split('@')[0] });

    const user = (await entities.User.filter({ email: normalizedEmail }))?.[0];
    if (user?.id) await entities.User.update(user.id, payload);
    else await entities.User.create({ ...payload, full_name: normalizedEmail, username: normalizedEmail.split('@')[0] });

    await ensureInviteForEmail(normalizedEmail, { role: 'owner', status: 'approved' });
    return payload;
  },
};

export const firebaseApi = {
  entities,
  auth: authApi,
  users: usersApi,
  integrations: {
    Core: {
      UploadFile: uploadFile,
    },
  },
  functions: functionsApi,
};

export default firebaseApi;
