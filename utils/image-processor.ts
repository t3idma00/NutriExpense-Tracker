import * as ImageManipulator from "expo-image-manipulator";

export async function preprocessReceiptImage(imageUri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 2048 } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );
  return result.uri;
}
