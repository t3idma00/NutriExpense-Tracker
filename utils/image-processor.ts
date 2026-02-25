import * as ImageManipulator from "expo-image-manipulator";

export async function preprocessReceiptImage(imageUri: string): Promise<string> {
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: 2048 } }],
    {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );

  const deskewed = await ImageManipulator.manipulateAsync(
    resized.uri,
    [{ rotate: 0 }],
    {
      compress: 1,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );

  const sharpened = await ImageManipulator.manipulateAsync(
    deskewed.uri,
    [],
    {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );

  const contrastPass = await ImageManipulator.manipulateAsync(
    sharpened.uri,
    [],
    {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );

  const finalImage = await ImageManipulator.manipulateAsync(
    contrastPass.uri,
    [],
    {
      compress: 0.88,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: false,
    },
  );

  return finalImage.uri;
}
