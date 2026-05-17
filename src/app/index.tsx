import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type DimensionsData = {
  height_cm: number;
  width_cm: number;
  length_cm: number;
};

export default function App() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dimensions, setDimensions] = useState<DimensionsData | null>(null);
  
  // The dynamic distance calibration state
  const [cameraDistance, setCameraDistance] = useState("30.0");

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setDimensions(null);
    }
  };

  // 2. The REAL Connection to Backend
  const calculateDimensions = async () => {
    if (!imageUri) {
      alert("Please select a photo of a meal first!");
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      
      const imageResponse = await fetch(imageUri);
      const imageBlob = await imageResponse.blob();
      formData.append('image', imageBlob, 'meal.jpg');
      
      const dummyBlob = new Blob([''], { type: 'application/octet-stream' });
      formData.append('depth_map', dummyBlob, 'placeholder.npy');
      
      // Pass the live UI distance value to the FastAPI server
      formData.append('camera_distance', cameraDistance); 

      const response = await fetch('http://127.0.0.1:8000/calculate-dimensions', {
        method: 'POST',
        body: formData, 
      });
      
      if (!response.ok) {
         throw new Error(`Server rejected request with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Render the true calculated parameters directly onto your green status box
      setDimensions(data.dimensions); 
      
    } catch (error) {
      console.error("Network Error:", error);
      alert("Backend connection failed! Double check your python terminal.");
    } finally {
      setIsAnalyzing(false); 
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>TruePlate MVP</Text>

      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderText}>No Meal Selected</Text>
        )}
      </View>

      {dimensions && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultTitle}>Real AI Dimensions:</Text>
          <Text style={styles.resultText}>Width: {dimensions.width_cm} cm</Text>
          <Text style={styles.resultText}>Length: {dimensions.length_cm} cm</Text>
          <Text style={styles.resultText}>Height: {dimensions.height_cm} cm</Text>
        </View>
      )}

      {/* NEW CALIBRATION BOX */}
      <View style={{ marginVertical: 15, width: '90%', alignSelf: 'center' }}>
        <Text style={{ color: 'white', marginBottom: 5, fontWeight: 'bold' }}>
          Assumed Camera Distance (cm):
        </Text>
        <TextInput 
          style={{ backgroundColor: 'white', padding: 12, borderRadius: 8, color: 'black' }}
          keyboardType="numeric"
          value={cameraDistance}
          onChangeText={setCameraDistance}
        />
        <Text style={{ color: '#aaaaaa', fontSize: 12, marginTop: 5 }}>
          * Increase this if the AI size is too small. Decrease if too big.
        </Text>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.secondaryButton} onPress={pickImage} disabled={isAnalyzing}>
          <Text style={styles.buttonText}>Select Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.primaryButton, isAnalyzing && styles.buttonDisabled]} 
          onPress={calculateDimensions}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Calculate Volume</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', alignItems: 'center', paddingTop: 50 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white', marginBottom: 20 },
  imageContainer: { width: '90%', height: 350, backgroundColor: '#222', borderRadius: 15, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 20 },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderText: { color: '#888', fontSize: 16 },
  resultsBox: { width: '90%', backgroundColor: '#059669', padding: 20, borderRadius: 10, marginBottom: 20 },
  resultTitle: { color: '#A7F3D0', fontSize: 14, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  resultText: { color: 'white', fontSize: 20, fontWeight: '500', marginBottom: 5 },
  bottomBar: { width: '90%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', marginBottom: 40 },
  secondaryButton: { flex: 1, backgroundColor: '#333', paddingVertical: 15, borderRadius: 10, marginRight: 10, alignItems: 'center' },
  primaryButton: { flex: 1, backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 10, marginLeft: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: '#1D4ED8', opacity: 0.7 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});