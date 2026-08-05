<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
    public function authorize()
    {return true;}
    public function rules()
    {
        return [
            'name'        => ['required', 'string', 'max:255', Rule::unique('categories', 'name')->ignore($this->category?->id)],
            'description' => 'nullable|string',
        ];
    }
}
