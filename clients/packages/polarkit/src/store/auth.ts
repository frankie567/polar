import { StateCreator } from 'zustand'
import { UserRead } from '../api/client'
import { api, CancelablePromise } from '../api'

export interface AuthSlice {
  hasChecked: boolean
  authenticated: boolean
  user: UserRead | null
  login: (
    callback?: (authenticated: boolean) => void,
  ) => CancelablePromise<UserRead>
}

export const createAuthSlice: StateCreator<AuthSlice> = (set, get) => ({
  hasChecked: false,
  authenticated: false,
  user: null,
  login: (
    callback?: (authenticated: boolean) => void,
  ): CancelablePromise<UserRead> => {
    const request = api.users.getAuthenticated()
    request
      .then((user) => {
        set({ authenticated: true, user })
      })
      .catch((err) => {
        set({ authenticated: false, user: null })
      })
      .finally(() => {
        set({ hasChecked: true })
        if (callback) {
          callback(get().authenticated)
        }
      })
    return request
  },
})