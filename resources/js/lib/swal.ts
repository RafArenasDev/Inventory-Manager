import BaseSwal, { type SweetAlertOptions, type SweetAlertResult } from 'sweetalert2';

function currentTheme(): 'light' | 'dark' {
    if (typeof document === 'undefined') {
        return 'light';
    }

    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

const Swal = {
    fire: (options: SweetAlertOptions): Promise<SweetAlertResult> => BaseSwal.fire({ theme: currentTheme(), ...options }),
};

export default Swal;
