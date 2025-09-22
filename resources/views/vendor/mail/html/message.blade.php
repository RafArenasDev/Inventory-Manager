@component('mail::layout')
{{-- Header --}}
@slot('header')
@component('mail::header', ['url' => config('app.url')])
{{ config('app.name') }}
@endcomponent
@endslot

{{-- Body --}}
{{ $slot }}

{{-- Subcopy --}}
@isset($subcopy)
    @component('mail::subcopy inline')
    {{ $subcopy }}
    @endcomponent
@endisset

{{-- Footer --}}
@slot('footer')
@component('mail::footer')
@lang('mail.footer')
@endcomponent
@endslot
@endcomponent
