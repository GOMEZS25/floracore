import axiosInstance from './axiosInstance';

const login = async (email, password) => {
    const response = await axiosInstance.post('/auth/login', {
        email,
        password
    });

    const data = response.data;
    return data;
};

export { login };
