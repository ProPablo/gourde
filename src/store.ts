import { useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// Set the string key and the initial value
const lastFileLocAtom = atomWithStorage<null | string>('last_file_loc', null);

export { lastFileLocAtom };