<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name'             => 'required|string|max:255',
            'email'            => [
                'required',
                'email',
                Rule::unique('users', 'email')->ignore($this->user?->id),
            ],
            'password'         => $this->isMethod('POST') ? 'required|string|min:6' : 'nullable|string|min:6',
            'confirm_password' => $this->isMethod('POST') ? 'required|same:password' : 'nullable|same:password',
            'roles'            => 'required|array',
            'roles.*'          => 'string|exists:roles,name',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'name.required'             => 'El nombre es obligatorio.',
            'email.required'            => 'El email es obligatorio.',
            'email.email'               => 'El email debe ser válido.',
            'email.unique'              => 'El email ya está registrado.',
            'password.required'         => 'La contraseña es obligatoria.',
            'password.min'              => 'La contraseña debe tener al menos 6 caracteres.',
            'confirm_password.required' => 'La confirmación de contraseña es obligatoria.',
            'confirm_password.same'     => 'Las contraseñas no coinciden.',
            'roles.required'            => 'Debe seleccionar al menos un rol.',
            'roles.array'               => 'Los roles deben ser un array.',
            'roles.*.exists'            => 'El rol seleccionado no es válido.',
        ];
    }
}
