import * as yup from 'yup';

export const SignUpSchema = yup.object().shape({
  email: yup
    .string()
    .email("Merci d'entrer une adresse email valide")
    .required("L'email est obligatoire"),
  password: yup
    .string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères')
    .required('Le mot de passe est obligatoire'),
});


