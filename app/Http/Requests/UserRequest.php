<?php

namespace App\Http\Requests;

use App\Support\ValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

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
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                ...ValidationRules::email(),
                Rule::unique('users', 'email')->ignore($this->user?->id),
            ],
            'password' => [
                $this->isMethod('POST') ? 'required' : 'nullable',
                'string',
                Password::defaults(),
            ],
            'confirm_password' => $this->isMethod('POST') ? 'required|same:password' : 'nullable|same:password',
            'roles' => 'required|array',
            'roles.*' => 'string|exists:roles,name',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'email.required' => 'El email es obligatorio.',
            'email.email' => 'El email debe ser válido.',
            'email.unique' => 'El email ya está registrado.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min' => 'La contraseña debe tener al menos 12 caracteres.',
            'password.letters' => 'La contraseña debe contener al menos una letra.',
            'password.mixed' => 'La contraseña debe contener mayúsculas y minúsculas.',
            'password.numbers' => 'La contraseña debe contener al menos un número.',
            'password.symbols' => 'La contraseña debe contener al menos un símbolo.',
            'confirm_password.required' => 'La confirmación de contraseña es obligatoria.',
            'confirm_password.same' => 'Las contraseñas no coinciden.',
            'roles.required' => 'Debe seleccionar al menos un rol.',
            'roles.array' => 'Los roles deben ser un array.',
            'roles.*.exists' => 'El rol seleccionado no es válido.',
        ];
    }
}
