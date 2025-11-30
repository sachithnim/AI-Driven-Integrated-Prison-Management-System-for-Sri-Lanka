import { useEffect, useState } from "react";
import { Lock, Zap, User } from "lucide-react";
import Input from "./../../components/input/Input";
import Button from "./../../components/button/Button";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/auth/auth";
import toast from "react-hot-toast";
import logo from "../../assets/logo.jpeg";
import prisonImage from "../../assets/prison.jpg";

export default function SignIn() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/");
    }
  }, [navigate]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username) {
      newErrors.username = "Username is required";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);

    try {
      const response = await login(formData);

      if (response.token) {
        localStorage.setItem("token", response.token);
        toast.success("Login successful! 🚀");
        navigate("/");
      } else {
        toast.error("Login failed. Please try again.");
      }
    } catch (error) {
      const msg = error?.response?.data?.message || "Something went wrong.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <img src={logo} alt="Logo" className="h-20 w-auto" />
            </div>
            <h1 className="text-3xl font-bold text-dark-900 mb-2">
              Prison Management System
            </h1>
            <p className="text-dark-600">
              Sign in to access your dashboard
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                type="text"
                label="Username"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                error={errors.username}
                icon={User}
                required
              />

              <Input
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                error={errors.password}
                icon={Lock}
                required
              />

              <div className="flex items-center justify-end text-sm">
                <a
                  href="#"
                  className="text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={loading}
                className="w-full"
              >
                Sign In
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-sm text-dark-500 mt-6">
            Secure access to prison management services
          </p>
        </div>
      </div>

      {/* Right Side - Background Image */}
      <div className="hidden lg:flex lg:flex-1 relative">
        <div className="absolute inset-0 bg-dark-900/60 z-10"></div>
        <img
          src={prisonImage}
          alt="Prison"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 z-20 flex items-center justify-center p-12">
          <div className="text-white text-center max-w-lg">
            <h2 className="text-4xl font-bold mb-4">
              Integrated Prison Management
            </h2>
            <p className="text-lg text-gray-200">
              AI-driven solutions for modern correctional facility management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}