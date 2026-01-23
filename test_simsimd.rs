use simsimd::SpatialSimilarity;

fn main() {
    // Test identical vectors
    let a = vec![1.0f32, 0.0, 0.0];
    let b = vec![1.0f32, 0.0, 0.0];
    println!("Identical: {:?}", f32::cosine(&a, &b));
    
    // Test orthogonal vectors
    let a = vec![1.0f32, 0.0, 0.0];
    let b = vec![0.0f32, 1.0, 0.0];
    println!("Orthogonal: {:?}", f32::cosine(&a, &b));
    
    // Test opposite vectors
    let a = vec![1.0f32, 0.0, 0.0];
    let b = vec![-1.0f32, 0.0, 0.0];
    println!("Opposite: {:?}", f32::cosine(&a, &b));
}
