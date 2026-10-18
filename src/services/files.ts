/**
 * Reading a user-picked file (plan JSON / backup) and sharing exports.
 */
import { Platform, Share } from 'react-native';
import {
  errorCodes,
  isErrorWithCode,
  keepLocalCopy,
  pick,
  saveDocuments,
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
    if (copy.status === 'success') {
      // localUri is a percent-encoded file:// URI.
      return await RNFS.readFile(
        decodeURIComponent(copy.localUri.replace(/^file:\/\//, '')),
        'utf8',
      );
    }
    // Fallback: RNFS reads content:// URIs as they are (no decoding).
    return await RNFS.readFile(
      file.uri.startsWith('file://')
        ? decodeURIComponent(file.uri.replace(/^file:\/\//, ''))
        : file.uri,
      'utf8',
    );
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED)
      return null;
    throw e;
  }
};

/**
 * Export a JSON file. iOS: share sheet with the file (Save to Files, AirDrop,
 * mail…). Android: "save as" dialog (Downloads, Drive…), which also works for
 * backups too big for a text share.
 */
export const shareJson = async (fileName: string, json: string) => {
  const path = `${RNFS.CachesDirectoryPath}/${fileName}`;
  await RNFS.writeFile(path, json, 'utf8');
  if (Platform.OS === 'ios') {
    await Share.share({ url: `file://${path}` });
    return;
  }
  try {
    await saveDocuments({
      sourceUris: [`file://${path}`],
      mimeType: 'application/json',
      fileName,
    });
  } catch (e) {
    if (isErrorWithCode(e) && e.code === errorCodes.OPERATION_CANCELED) return;
    throw e;
  }
};
