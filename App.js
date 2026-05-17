import { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, SafeAreaView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dimensions, setDimensions] = useState(null);

  // 1. Open Phone Gallery
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setDimensions(null); // Clear old results
    }
  };

  // 2. Send Data to Sarthak's Server
  const calculateDimensions = async () => {
    if (!imageUri) {
      alert("Please select a photo of a meal first!");
      return;
    }

    setIsAnalyzing(true);

    /* ====================================================================
    THE REAL NETWORK REQUEST
    When you are on Sarthak's Wi-Fi, you will use this code. 
    (Replace 192.168.X.X with his actual IP Address)
    ====================================================================
    
    const formData = new FormData();
    // Attach the real image
    formData.append('image', { uri: imageUri, name: 'meal.jpg', type: 'image/jpeg' });
    
    // For tonight's MVP, we fake the depth map until ARCore is built
    // Sarthak needs to send you his test_lidar.npy file to put in your assets folder
    formData.append('depth_map', { uri: 'FAKED_NPY_FILE_URI', name: 'test_lidar.npy', type: 'application/octet-stream' });
    
    formData.append('focal_length', '26.0');

    try {
      const response = await fetch('http://192.168.X.X:8000/calculate-dimensions', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      
      const data = await response.json();
      setDimensions(data.dimensions);
    } catch (error) {
      console.error("Network Error:", error);
      alert("Could not connect to Sarthak's server.");
    }
    */

    // --- FAKE DELAY FOR TESTING UI TONIGHT (Remove this block when using the real fetch above) ---
    setTimeout(() => {
      setDimensions({ height_cm: 4.2, width_cm: 15.6, length_cm: 12.1 });
      setIsAnalyzing(false);
    }, 2500);
    // ------------------------------------------------------------------------------------------
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>TruePlate MVP</Text>

      {/* Image Preview Box */}
      <View style={styles.imageContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.placeholderText}>No Meal Selected</Text>
        )}
      </View>

      {/* Results Box */}
      {dimensions && (
        <View style={styles.resultsBox}>
          <Text style={styles.resultTitle}>Calculated Dimensions:</Text>
          <Text style={styles.resultText}>Width: {dimensions.width_cm} cm</Text>
          <Text style={styles.resultText}>Length: {dimensions.length_cm} cm</Text>
          <Text style={styles.resultText}>Height: {dimensions.height_cm} cm</Text>
        </View>
      )}

      {/* Buttons */}
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
  resultsBox: { width: '90%', backgroundColor: '#1E3A8A', padding: 20, borderRadius: 10, marginBottom: 20 },
  resultTitle: { color: '#60A5FA', fontSize: 14, fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  resultText: { color: 'white', fontSize: 20, fontWeight: '500', marginBottom: 5 },
  bottomBar: { width: '90%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', marginBottom: 40 },
  secondaryButton: { flex: 1, backgroundColor: '#333', paddingVertical: 15, borderRadius: 10, marginRight: 10, alignItems: 'center' },
  primaryButton: { flex: 1, backgroundColor: '#2563EB', paddingVertical: 15, borderRadius: 10, marginLeft: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  buttonDisabled: { backgroundColor: '#1D4ED8', opacity: 0.7 },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});