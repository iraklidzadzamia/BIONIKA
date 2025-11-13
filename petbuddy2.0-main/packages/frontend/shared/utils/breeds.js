export const dogBreeds = [
  { value: "labrador-retriever", label: "Labrador Retriever" },
  { value: "german-shepherd", label: "German Shepherd" },
  { value: "golden-retriever", label: "Golden Retriever" },
  { value: "french-bulldog", label: "French Bulldog" },
  { value: "bulldog", label: "Bulldog" },
  { value: "poodle", label: "Poodle" },
  { value: "beagle", label: "Beagle" },
  { value: "rottweiler", label: "Rottweiler" },
  { value: "dachshund", label: "Dachshund" },
  { value: "yorkshire-terrier", label: "Yorkshire Terrier" },
  { value: "boxer", label: "Boxer" },
  { value: "chihuahua", label: "Chihuahua" },
  { value: "great-dane", label: "Great Dane" },
  { value: "siberian-husky", label: "Siberian Husky" },
  { value: "doberman-pinscher", label: "Doberman Pinscher" },
  { value: "shih-tzu", label: "Shih Tzu" },
  { value: "boston-terrier", label: "Boston Terrier" },
  { value: "bernese-mountain-dog", label: "Bernese Mountain Dog" },
  {
    value: "cavalier-king-charles-spaniel",
    label: "Cavalier King Charles Spaniel",
  },
  { value: "pomeranian", label: "Pomeranian" },
  { value: "australian-shepherd", label: "Australian Shepherd" },
  { value: "border-collie", label: "Border Collie" },
  { value: "corgi", label: "Corgi" },
  { value: "samoyed", label: "Samoyed" },
  { value: "newfoundland", label: "Newfoundland" },
  { value: "saint-bernard", label: "Saint Bernard" },
  { value: "mastiff", label: "Mastiff" },
  { value: "great-pyrenees", label: "Great Pyrenees" },
  { value: "mixed-breed", label: "Mixed Breed" },
  { value: "other", label: "Other" },
];

export const catBreeds = [
  { value: "persian", label: "Persian" },
  { value: "siamese", label: "Siamese" },
  { value: "maine-coon", label: "Maine Coon" },
  { value: "ragdoll", label: "Ragdoll" },
  { value: "british-shorthair", label: "British Shorthair" },
  { value: "abyssinian", label: "Abyssinian" },
  { value: "russian-blue", label: "Russian Blue" },
  { value: "bengal", label: "Bengal" },
  { value: "sphynx", label: "Sphynx" },
  { value: "american-shorthair", label: "American Shorthair" },
  { value: "mixed-breed", label: "Mixed Breed" },
  { value: "other", label: "Other" },
];

export const getBreedsBySpecies = (species) => {
  switch (species) {
    case "dog":
      return dogBreeds;
    case "cat":
      return catBreeds;
    default:
      return [...dogBreeds, ...catBreeds];
  }
};
