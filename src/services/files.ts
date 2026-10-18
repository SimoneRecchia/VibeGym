/**
 * Reading a user-picked file (plan JSON / backup) and sharing exports.
 */
import { Platform, Share } from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  types,
} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';

/** Let the user pick a text/JSON file and return its content (null if cancelled). */
export const pickTextFile = async (): Promise<string | null> => {
  try {
    const [file] = await pick({
      type: [types.json, types.plainText, types.allFiles],
      allowMultiSelection: false,
    });
    if (!file) return null;
    // Copy into the sandbox first: content:// (Android) and security-scoped
    // (iOS) URIs are not always readable directly.
    const [copy] = await keepLocalCopy({
      files: [{ uri: file.uri, fileName: file.name ?? 'import.json' }],
      destination: 'cachesDirectory',
    });
    const uri = copy.status === 'success' ? copy.localUri : file.uri;
    const path = decodeURIComponent(uri.replace(/^file:\/\//, ''));
    return await RNFS.readFile(path, 'utf8');
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)
      return null;
    throw e;
  }
};

/** Share a JSON export: a real file on iOS, text on Android. */
export const shareJson = async (fileName: string, json: string) => {
  if (Platform.OS === 'ios') {
    const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
    await RNFS.writeFile(path, json, 'utf8');
    await Share.share({ url: `file://${path}` });
  } else {
    await Share.share({ message: json, title: fileName });
  }
};
